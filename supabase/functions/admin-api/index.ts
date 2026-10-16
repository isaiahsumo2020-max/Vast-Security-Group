import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS"
};

const adminRoles = [
    "Super Admin",
    "HR Admin",
    "Recruitment Admin",
    "Operations Admin",
    "Security/Post Admin",
    "Finance Admin",
    "Custom Admin"
];

const websiteImageKeys = new Set([
    "site_logo_url",
    "home_banner_url",
    "about_banner_url",
    "services_banner_url",
    "recruitment_banner_url",
    "contact_banner_url",
    "verification_banner_url",
    "about_story_image_url",
    "ceo_photo_url",
    "co_ceo_photo_url"
]);

const websiteTextLimits: Record<string, number> = {
    site_name: 160,
    ceo_heading: 200,
    ceo_name: 160,
    ceo_title: 160,
    ceo_message: 8000,
    co_ceo_heading: 200,
    co_ceo_name: 160,
    co_ceo_title: 160,
    co_ceo_message: 8000
};

const websiteContentKeys = new Set([
    ...websiteImageKeys,
    ...Object.keys(websiteTextLimits)
]);

const defaultPermissions: Record<string, Record<string, boolean>> = {
    "Super Admin": { all: true },
    "HR Admin": {
        officers_view: true,
        officers_create: true,
        officers_edit: true,
        officers_delete: false,
        recruitment_view: true,
        recruitment_manage: true,
        posts_view: false,
        posts_manage: false,
        finance_view: false,
        finance_manage: false,
        administrators_manage: false,
        settings_manage: false
    },
    "Recruitment Admin": {
        officers_view: true,
        officers_create: false,
        officers_edit: false,
        officers_delete: false,
        recruitment_view: true,
        recruitment_manage: true,
        posts_view: false,
        posts_manage: false,
        finance_view: false,
        finance_manage: false,
        administrators_manage: false,
        settings_manage: false
    },
    "Operations Admin": {
        officers_view: true,
        officers_create: false,
        officers_edit: true,
        officers_delete: false,
        recruitment_view: false,
        recruitment_manage: false,
        posts_view: true,
        posts_manage: true,
        finance_view: false,
        finance_manage: false,
        administrators_manage: false,
        settings_manage: false
    },
    "Security/Post Admin": {
        officers_view: true,
        officers_create: false,
        officers_edit: false,
        officers_delete: false,
        recruitment_view: false,
        recruitment_manage: false,
        posts_view: true,
        posts_manage: true,
        finance_view: false,
        finance_manage: false,
        administrators_manage: false,
        settings_manage: false
    },
    "Finance Admin": {
        officers_view: false,
        officers_create: false,
        officers_edit: false,
        officers_delete: false,
        recruitment_view: false,
        recruitment_manage: false,
        posts_view: false,
        posts_manage: false,
        finance_view: true,
        finance_manage: true,
        administrators_manage: false,
        settings_manage: false
    },
    "Custom Admin": {}
};

type JsonRecord = Record<string, unknown>;
type AuthenticatedAdmin = {
    user: { id: string; email?: string };
    profile: JsonRecord;
};

class HttpError extends Error {
    constructor(
        readonly status: number,
        message: string
    ) {
        super(message);
    }
}

function respond(body: JsonRecord, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
        }
    });
}

function throwIfError(error: { message: string } | null) {
    if (error) {
        throw new HttpError(400, error.message);
    }
}

async function readJson(request: Request): Promise<JsonRecord> {
    let body: unknown;

    try {
        body = await request.json();
    } catch {
        throw new HttpError(400, "Request body must be valid JSON.");
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
        throw new HttpError(400, "Request body must be a JSON object.");
    }

    return body as JsonRecord;
}

async function authenticateAdmin(
    request: Request,
    client: ReturnType<typeof createClient>
): Promise<AuthenticatedAdmin> {
    const authorization = request.headers.get("authorization");
    const token = authorization?.startsWith("Bearer ")
        ? authorization.slice("Bearer ".length)
        : "";

    if (!token) {
        throw new HttpError(401, "Authentication required.");
    }

    const {
        data: { user },
        error: userError
    } = await client.auth.getUser(token);

    if (userError || !user) {
        throw new HttpError(401, "Invalid or expired session.");
    }

    const { data: profile, error: profileError } = await client
        .from("admin_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

    if (profileError) {
        console.error("Administrator profile lookup failed:", profileError);
        throw new HttpError(500, "Unable to verify administrator profile.");
    }

    if (!profile) {
        throw new HttpError(403, "Administrator access denied.");
    }

    if (profile.status !== "Active") {
        throw new HttpError(403, "Administrator account is inactive.");
    }

    return { user, profile };
}

function requirePermission(
    admin: AuthenticatedAdmin,
    permission: string
) {
    const permissions = admin.profile.permissions as
        | Record<string, unknown>
        | null;

    if (
        admin.profile.role === "Super Admin" ||
        permissions?.all === true
    ) {
        return;
    }

    if (permissions?.[permission] !== true) {
        throw new HttpError(403, `Permission denied: ${permission}`);
    }
}

function requireSuperAdmin(admin: AuthenticatedAdmin) {
    if (admin.profile.role !== "Super Admin") {
        throw new HttpError(403, "Super Admin access required.");
    }
}

async function recordAudit(
    client: ReturnType<typeof createClient>,
    admin: AuthenticatedAdmin,
    action: string,
    entityType: string,
    entityId: string | null,
    details: JsonRecord = {}
) {
    const { error } = await client
        .from("vsg_admin_audit_logs")
        .insert({
            actor_user_id: admin.user.id,
            actor_name: admin.profile.full_name,
            actor_email: admin.user.email || null,
            action,
            entity_type: entityType,
            entity_id: entityId,
            details
        });

    if (error) {
        console.error("Unable to record admin audit event:", error);
        throw new HttpError(
            500,
            "The change was applied, but its audit event could not be saved."
        );
    }
}

async function handlePublicRequest(
    request: Request,
    client: ReturnType<typeof createClient>,
    segments: string[]
): Promise<Response | null> {
    if (
        request.method === "GET" &&
        segments.length === 2 &&
        segments[0] === "public" &&
        segments[1] === "recruitment-positions"
    ) {
        const { data, error } = await client
            .from("recruitment_positions")
            .select("id, title")
            .eq("is_active", true)
            .order("title", { ascending: true });

        if (error) {
            console.error("Unable to load public recruitment positions:", error);
            throw new HttpError(500, "Unable to load recruitment positions.");
        }

        return respond({ success: true, positions: data || [] });
    }

    if (
        request.method === "GET" &&
        segments.length === 2 &&
        segments[0] === "public" &&
        segments[1] === "site-content"
    ) {
        const { data, error } = await client
            .from("vsg_website_content")
            .select("content_key, content_value")
            .in("content_key", [...websiteContentKeys]);

        if (error) {
            console.error("Unable to load public website content:", error);
            throw new HttpError(500, "Unable to load website content.");
        }

        return respond({
            success: true,
            content: Object.fromEntries(
                (data || []).map(item => [item.content_key, item.content_value])
            )
        });
    }

    if (
        request.method === "GET" &&
        segments.length === 3 &&
        segments[0] === "public" &&
        segments[1] === "officers"
    ) {
        const officerId = segments[2].toUpperCase();
        if (!/^VSG-\d{4}-\d{3,}$/.test(officerId)) {
            throw new HttpError(400, "Enter a valid VAST Officer ID.");
        }

        const { data, error } = await client
            .from("officers")
            .select("officer_id, name, position, department, employment, status, issueDate, expiryDate, photo")
            .eq("officer_id", officerId)
            .maybeSingle();

        if (error) {
            console.error("Unable to verify public officer ID:", error);
            throw new HttpError(500, "Unable to verify this officer right now.");
        }

        if (!data) {
            throw new HttpError(404, "No officer was found with that ID.");
        }

        return respond({ success: true, officer: data });
    }

    if (
        request.method === "GET" &&
        segments.length === 2 &&
        segments[0] === "public" &&
        segments[1] === "services"
    ) {
        const { data, error } = await client
            .from("vsg_website_services")
            .select("id, title, description, icon, display_order")
            .eq("is_active", true)
            .order("display_order", { ascending: true });

        if (error) {
            console.error("Unable to load public services:", error);
            throw new HttpError(500, "Unable to load services.");
        }

        return respond({ success: true, services: data });
    }

    if (
        request.method === "POST" &&
        segments.length === 1 &&
        segments[0] === "contact-messages"
    ) {
        const body = await readJson(request);
        const name = typeof body.name === "string" ? body.name.trim() : "";
        const email = typeof body.email === "string"
            ? body.email.trim()
            : "";
        const phone = typeof body.phone === "string"
            ? body.phone.trim()
            : "";
        const subject = typeof body.subject === "string"
            ? body.subject.trim()
            : "";
        const message = typeof body.message === "string"
            ? body.message.trim()
            : "";

        if (
            !name ||
            name.length > 160 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
            email.length > 254 ||
            phone.length > 60 ||
            !subject ||
            subject.length > 200 ||
            !message ||
            message.length > 10000
        ) {
            throw new HttpError(400, "Please provide valid contact details and a message.");
        }

        const { data, error } = await client
            .from("vsg_contact_messages")
            .insert({ name, email, phone: phone || null, subject, message })
            .select("id")
            .single();

        if (error) {
            console.error("Unable to save contact message:", error);
            throw new HttpError(500, "Unable to save your message.");
        }

        return respond({
            success: true,
            message: "Your message has been received.",
            id: data.id
        }, 201);
    }

    return null;
}

async function handleRequest(
    request: Request,
    client: ReturnType<typeof createClient>,
    admin: AuthenticatedAdmin,
    segments: string[]
) {
    const method = request.method;

    if (
        method === "GET" &&
        segments.length === 2 &&
        segments[0] === "auth" &&
        segments[1] === "session"
    ) {
        return respond({
            success: true,
            user: {
                id: admin.user.id,
                email: admin.user.email
            },
            profile: admin.profile
        });
    }

    if (
        method === "PATCH" &&
        segments.length === 2 &&
        segments[0] === "auth" &&
        segments[1] === "profile"
    ) {
        const body = await readJson(request);
        const updates: JsonRecord = {
            updated_at: new Date().toISOString()
        };

        if (typeof body.full_name === "string") {
            const fullName = body.full_name.trim();
            if (!fullName || fullName.length > 160) {
                throw new HttpError(400, "Enter a valid full name.");
            }
            updates.full_name = fullName;
        }

        if (body.phone !== undefined) {
            if (
                typeof body.phone !== "string" ||
                body.phone.length > 60
            ) {
                throw new HttpError(400, "Enter a valid phone number.");
            }
            updates.phone = body.phone.trim() || null;
        }

        if (body.department !== undefined) {
            if (
                typeof body.department !== "string" ||
                body.department.length > 120
            ) {
                throw new HttpError(400, "Enter a valid department.");
            }
            updates.department = body.department.trim() || null;
        }

        if (Object.keys(updates).length === 1) {
            throw new HttpError(400, "No profile changes were provided.");
        }

        const { data, error } = await client
            .from("admin_profiles")
            .update(updates)
            .eq("user_id", admin.user.id)
            .select()
            .single();
        throwIfError(error);

        await recordAudit(
            client,
            admin,
            "profile.updated",
            "admin_profile",
            admin.user.id,
            { fields: Object.keys(updates).filter(key => key !== "updated_at") }
        );

        return respond({
            success: true,
            message: "Profile updated successfully.",
            profile: data
        });
    }

    if (
        method === "POST" &&
        segments.length === 2 &&
        segments[0] === "auth" &&
        segments[1] === "avatar"
    ) {
        let form: FormData;
        try {
            form = await request.formData();
        } catch {
            throw new HttpError(400, "Upload form data is invalid.");
        }

        const file = form.get("file");
        if (!(file instanceof File)) {
            throw new HttpError(400, "Choose a profile image to upload.");
        }

        const extensionByType: Record<string, string> = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/webp": "webp"
        };
        const extension = extensionByType[file.type];
        if (!extension) {
            throw new HttpError(400, "Use a JPEG, PNG, or WebP profile image.");
        }
        if (file.size === 0 || file.size > 3 * 1024 * 1024) {
            throw new HttpError(400, "Profile images must be no larger than 3 MB.");
        }

        const objectPath =
            `${admin.user.id}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await client.storage
            .from("vsg-admin-avatars")
            .upload(objectPath, file, {
                contentType: file.type,
                cacheControl: "3600",
                upsert: false
            });

        if (uploadError) {
            console.error("Administrator avatar upload failed:", uploadError);
            throw new HttpError(500, "Unable to upload the profile image.");
        }

        const { data: publicUrl } = client.storage
            .from("vsg-admin-avatars")
            .getPublicUrl(objectPath);
        const { data: profile, error: profileError } = await client
            .from("admin_profiles")
            .update({
                avatar_url: publicUrl.publicUrl,
                updated_at: new Date().toISOString()
            })
            .eq("user_id", admin.user.id)
            .select()
            .single();
        throwIfError(profileError);

        await recordAudit(
            client,
            admin,
            "profile.avatar_updated",
            "admin_profile",
            admin.user.id
        );

        return respond({
            success: true,
            message: "Profile image updated.",
            avatarUrl: profile.avatar_url
        });
    }

    if (
        method === "POST" &&
        segments.length === 2 &&
        segments[0] === "auth" &&
        segments[1] === "password"
    ) {
        const body = await readJson(request);
        const password = body.password;

        if (typeof password !== "string" || password.length < 8) {
            throw new HttpError(
                400,
                "Password must contain at least 8 characters."
            );
        }

        const { error } = await client.auth.admin.updateUserById(
            admin.user.id,
            { password }
        );
        throwIfError(error);

        await recordAudit(
            client,
            admin,
            "password.updated",
            "admin_profile",
            admin.user.id
        );

        return respond({
            success: true,
            message: "Password changed successfully."
        });
    }

    if (segments[0] === "notifications") {
        if (method === "GET" && segments.length === 1) {
            const [{ data, error }, { count, error: countError }] =
                await Promise.all([
                    client
                        .from("vsg_admin_notifications")
                        .select(
                            "id, notification_type, title, body, target_path, entity_id, created_at, read_at"
                        )
                        .eq("admin_user_id", admin.user.id)
                        .order("created_at", { ascending: false })
                        .limit(30),
                    client
                        .from("vsg_admin_notifications")
                        .select("id", { count: "exact", head: true })
                        .eq("admin_user_id", admin.user.id)
                        .is("read_at", null)
                ]);
            throwIfError(error);
            throwIfError(countError);

            return respond({
                success: true,
                notifications: data || [],
                unreadCount: count || 0
            });
        }

        if (
            method === "PATCH" &&
            segments.length === 2 &&
            segments[1] === "read-all"
        ) {
            const { error } = await client
                .from("vsg_admin_notifications")
                .update({ read_at: new Date().toISOString() })
                .eq("admin_user_id", admin.user.id)
                .is("read_at", null);
            throwIfError(error);
            return respond({ success: true });
        }

        if (method === "PATCH" && segments.length === 2) {
            const { data, error } = await client
                .from("vsg_admin_notifications")
                .update({ read_at: new Date().toISOString() })
                .eq("id", segments[1])
                .eq("admin_user_id", admin.user.id)
                .select("id")
                .maybeSingle();
            throwIfError(error);
            if (!data) {
                throw new HttpError(404, "Notification not found.");
            }

            return respond({ success: true });
        }

    }

    if (segments[0] === "audit-logs") {
        requireSuperAdmin(admin);

        if (method === "GET" && segments.length === 1) {
            const { data, error } = await client
                .from("vsg_admin_audit_logs")
                .select(`
                    id,
                    actor_name,
                    actor_email,
                    action,
                    entity_type,
                    entity_id,
                    details,
                    created_at
                `)
                .order("created_at", { ascending: false })
                .limit(250);
            throwIfError(error);
            return respond({ success: true, auditLogs: data });
        }
    }

    if (segments[0] === "contact-messages") {
        requirePermission(admin, "messages_view");

        if (method === "GET" && segments.length === 1) {
            const { data, error } = await client
                .from("vsg_contact_messages")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(500);
            throwIfError(error);
            return respond({ success: true, messages: data });
        }

        if (method === "PATCH" && segments.length === 2) {
            const body = await readJson(request);
            if (!["New", "In Progress", "Resolved"].includes(body.status as string)) {
                throw new HttpError(400, "Invalid message status.");
            }

            const { data, error } = await client
                .from("vsg_contact_messages")
                .update({
                    status: body.status,
                    updated_at: new Date().toISOString()
                })
                .eq("id", segments[1])
                .select("id, status")
                .single();
            throwIfError(error);
            await recordAudit(
                client,
                admin,
                "message.status_updated",
                "contact_message",
                segments[1],
                { status: body.status }
            );
            return respond({
                success: true,
                message: "Message status updated.",
                contactMessage: data
            });
        }
    }

    if (segments[0] === "services") {
        requirePermission(admin, "settings_manage");

        if (method === "GET" && segments.length === 1) {
            const { data, error } = await client
                .from("vsg_website_services")
                .select("*")
                .order("display_order", { ascending: true });
            throwIfError(error);
            return respond({ success: true, services: data });
        }

        if (method === "POST" && segments.length === 1) {
            const body = await readJson(request);
            const title = typeof body.title === "string"
                ? body.title.trim()
                : "";
            const description = typeof body.description === "string"
                ? body.description.trim()
                : "";

            if (!title || title.length > 120 || !description || description.length > 2000) {
                throw new HttpError(
                    400,
                    "Enter a service title and description within the allowed lengths."
                );
            }

            const { data, error } = await client
                .from("vsg_website_services")
                .insert({
                    title,
                    description,
                    icon: typeof body.icon === "string"
                        ? body.icon.trim()
                        : "fa-shield-halved",
                    display_order: Number.isInteger(body.display_order)
                        ? body.display_order
                        : 0,
                    is_active: body.is_active !== false
                })
                .select()
                .single();
            throwIfError(error);
            await recordAudit(
                client,
                admin,
                "service.created",
                "website_service",
                data.id,
                { title }
            );
            return respond({
                success: true,
                message: "Service created.",
                service: data
            }, 201);
        }

        if (method === "PATCH" && segments.length === 2) {
            const body = await readJson(request);
            const updates: JsonRecord = {
                updated_at: new Date().toISOString()
            };

            if (body.title !== undefined) {
                if (typeof body.title !== "string" || !body.title.trim() || body.title.length > 120) {
                    throw new HttpError(400, "Enter a valid service title.");
                }
                updates.title = body.title.trim();
            }
            if (body.description !== undefined) {
                if (typeof body.description !== "string" || !body.description.trim() || body.description.length > 2000) {
                    throw new HttpError(400, "Enter a valid service description.");
                }
                updates.description = body.description.trim();
            }
            if (body.icon !== undefined) {
                if (typeof body.icon !== "string" || body.icon.length > 80) {
                    throw new HttpError(400, "Enter a valid Font Awesome icon name.");
                }
                updates.icon = body.icon.trim() || "fa-shield-halved";
            }
            if (body.display_order !== undefined) {
                if (!Number.isInteger(body.display_order)) {
                    throw new HttpError(400, "Display order must be a whole number.");
                }
                updates.display_order = body.display_order;
            }
            if (body.is_active !== undefined) {
                if (typeof body.is_active !== "boolean") {
                    throw new HttpError(400, "Service visibility must be true or false.");
                }
                updates.is_active = body.is_active;
            }

            const { data, error } = await client
                .from("vsg_website_services")
                .update(updates)
                .eq("id", segments[1])
                .select()
                .single();
            throwIfError(error);
            await recordAudit(
                client,
                admin,
                "service.updated",
                "website_service",
                segments[1],
                { fields: Object.keys(updates).filter(key => key !== "updated_at") }
            );
            return respond({
                success: true,
                message: "Service updated.",
                service: data
            });
        }

        if (method === "DELETE" && segments.length === 2) {
            const { data, error } = await client
                .from("vsg_website_services")
                .delete()
                .eq("id", segments[1])
                .select("id, title")
                .single();
            throwIfError(error);
            await recordAudit(
                client,
                admin,
                "service.deleted",
                "website_service",
                segments[1],
                { title: data.title }
            );
            return respond({
                success: true,
                message: "Service deleted."
            });
        }
    }

    if (segments[0] === "site-content") {
        requirePermission(admin, "settings_manage");

        if (method === "GET" && segments.length === 1) {
            const { data, error } = await client
                .from("vsg_website_content")
                .select("content_key, content_value, updated_at")
                .in("content_key", [...websiteContentKeys]);
            throwIfError(error);

            return respond({
                success: true,
                content: Object.fromEntries(
                    (data || []).map(item => [
                        item.content_key,
                        item.content_value
                    ])
                )
            });
        }

        if (
            method === "POST" &&
            segments.length === 2 &&
            segments[1] === "assets"
        ) {
            let form: FormData;
            try {
                form = await request.formData();
            } catch {
                throw new HttpError(400, "Upload form data is invalid.");
            }

            const slot = form.get("slot");
            const file = form.get("file");
            if (
                typeof slot !== "string" ||
                !websiteImageKeys.has(slot) ||
                !(file instanceof File)
            ) {
                throw new HttpError(400, "Select a valid website image and upload slot.");
            }

            const extensionByType: Record<string, string> = {
                "image/jpeg": "jpg",
                "image/png": "png",
                "image/webp": "webp"
            };
            const extension = extensionByType[file.type];
            if (!extension) {
                throw new HttpError(400, "Use a JPEG, PNG, or WebP image.");
            }
            if (file.size === 0 || file.size > 5 * 1024 * 1024) {
                throw new HttpError(400, "Images must be no larger than 5 MB.");
            }

            const objectPath = `${slot}/${crypto.randomUUID()}.${extension}`;
            const { error } = await client.storage
                .from("vsg-website-assets")
                .upload(objectPath, file, {
                    contentType: file.type,
                    cacheControl: "3600",
                    upsert: false
                });

            if (error) {
                console.error("Website image upload failed:", error);
                throw new HttpError(500, "Unable to upload the website image.");
            }

            const { data: publicUrl } = client.storage
                .from("vsg-website-assets")
                .getPublicUrl(objectPath);

            await recordAudit(
                client,
                admin,
                "website.image_uploaded",
                "website_content",
                slot,
                { path: objectPath, size: file.size, content_type: file.type }
            );

            return respond({
                success: true,
                imageUrl: publicUrl.publicUrl
            }, 201);
        }

        if (method === "PATCH" && segments.length === 1) {
            const body = await readJson(request);
            const settings = body.settings;
            if (
                !settings ||
                typeof settings !== "object" ||
                Array.isArray(settings)
            ) {
                throw new HttpError(400, "Website content settings are required.");
            }

            const entries = Object.entries(settings);
            if (!entries.length || entries.length > websiteContentKeys.size) {
                throw new HttpError(400, "Select valid website content to save.");
            }

            const imageUrlPrefix =
                `${Deno.env.get("SUPABASE_URL")}/storage/v1/object/public/vsg-website-assets/`;
            const updates = entries.map(([key, value]) => {
                if (!websiteContentKeys.has(key) || typeof value !== "string") {
                    throw new HttpError(400, "Unknown or invalid website content field.");
                }
                if (websiteImageKeys.has(key)) {
                    if (
                        value &&
                        !value.startsWith(imageUrlPrefix) &&
                        !/^\/assests\/images\/[A-Za-z0-9_%()./-]+$/.test(value)
                    ) {
                        throw new HttpError(400, "Website images must be uploaded through this dashboard.");
                    }
                    return {
                        content_key: key,
                        content_value: value,
                        updated_at: new Date().toISOString()
                    };
                }

                const maxLength = websiteTextLimits[key];
                if (value.length > maxLength) {
                    throw new HttpError(
                        400,
                        `${key.replaceAll("_", " ")} must be ${maxLength} characters or fewer.`
                    );
                }

                return {
                    content_key: key,
                    content_value: value.trim(),
                    updated_at: new Date().toISOString()
                };
            });

            const { error } = await client
                .from("vsg_website_content")
                .upsert(updates, { onConflict: "content_key" });
            throwIfError(error);

            await recordAudit(
                client,
                admin,
                "website.content_updated",
                "website_content",
                null,
                { fields: entries.map(([key]) => key) }
            );

            return respond({
                success: true,
                message: "Public website content updated."
            });
        }
    }

    if (segments[0] === "administrators") {
        requireSuperAdmin(admin);

        if (method === "GET" && segments.length === 1) {
            const { data, error } = await client
                .from("admin_profiles")
                .select(`
                    id,
                    user_id,
                    full_name,
                    phone,
                    department,
                    role,
                    status,
                    permissions,
                    created_at,
                    updated_at
                `)
                .order("created_at", { ascending: false });
            throwIfError(error);
            return respond({ success: true, administrators: data });
        }

        if (method === "POST" && segments.length === 1) {
            const body = await readJson(request);
            const email = body.email;
            const password = body.password;
            const fullName = body.full_name;
            const role = body.role ?? "Custom Admin";

            if (!email || !password || !fullName) {
                throw new HttpError(
                    400,
                    "Email, password, and full name are required."
                );
            }

            if (typeof role !== "string" || !adminRoles.includes(role)) {
                throw new HttpError(400, "Invalid administrator role.");
            }

            const permissions = body.permissions ??
                defaultPermissions[role] ??
                {};
            const { data: authData, error: authError } =
                await client.auth.admin.createUser({
                    email: String(email),
                    password: String(password),
                    email_confirm: true
                });
            throwIfError(authError);

            const { data: profile, error: profileError } = await client
                .from("admin_profiles")
                .insert({
                    user_id: authData.user.id,
                    full_name: fullName,
                    phone: body.phone || null,
                    department: body.department || null,
                    role,
                    status: "Active",
                    permissions
                })
                .select()
                .single();

            if (profileError) {
                const { error: rollbackError } =
                    await client.auth.admin.deleteUser(authData.user.id);

                if (rollbackError) {
                    console.error(
                        "Unable to roll back administrator Auth user:",
                        rollbackError
                    );
                }

                throw new HttpError(400, profileError.message);
            }

            await recordAudit(
                client,
                admin,
                "administrator.created",
                "admin_profile",
                authData.user.id,
                { email: authData.user.email, role }
            );

            return respond({
                success: true,
                message: "Administrator created successfully.",
                administrator: profile
            }, 201);
        }

        if (method === "PATCH" && segments.length === 2) {
            const userId = segments[1];
            const body = await readJson(request);
            const role = body.role;
            const status = body.status;
            const permissions = body.permissions;

            if (userId === admin.user.id) {
                if (role !== undefined) {
                    throw new HttpError(
                        400,
                        "You cannot change your own administrator role."
                    );
                }
                if (status !== undefined && status !== "Active") {
                    throw new HttpError(
                        400,
                        "You cannot deactivate your own administrator account."
                    );
                }
                if (permissions !== undefined) {
                    throw new HttpError(
                        400,
                        "You cannot change your own administrator permissions."
                    );
                }
            }

            if (
                role !== undefined &&
                (typeof role !== "string" || !adminRoles.includes(role))
            ) {
                throw new HttpError(400, "Invalid administrator role.");
            }

            const finalPermissions = permissions !== undefined
                ? permissions
                : role
                    ? defaultPermissions[String(role)] ?? {}
                    : undefined;
            const updates: JsonRecord = {
                updated_at: new Date().toISOString()
            };

            if (body.full_name !== undefined) {
                updates.full_name = body.full_name;
            }
            if (body.phone !== undefined) {
                updates.phone = body.phone || null;
            }
            if (body.department !== undefined) {
                updates.department = body.department || null;
            }
            if (role !== undefined) {
                updates.role = role;
            }
            if (status !== undefined) {
                updates.status = status;
            }
            if (finalPermissions !== undefined) {
                updates.permissions = finalPermissions;
            }

            const { data, error } = await client
                .from("admin_profiles")
                .update(updates)
                .eq("user_id", userId)
                .select()
                .single();
            throwIfError(error);

            await recordAudit(
                client,
                admin,
                "administrator.updated",
                "admin_profile",
                userId,
                {
                    fields: Object.keys(updates).filter(
                        field => field !== "updated_at"
                    )
                }
            );

            return respond({
                success: true,
                message: "Administrator updated successfully.",
                administrator: data
            });
        }

        if (
            method === "POST" &&
            segments.length === 3 &&
            segments[2] === "reset-password"
        ) {
            const body = await readJson(request);
            const newPassword = body.newPassword;

            if (
                typeof newPassword !== "string" ||
                newPassword.length < 8
            ) {
                throw new HttpError(
                    400,
                    "Password must contain at least 8 characters."
                );
            }

            const { error } = await client.auth.admin.updateUserById(
                segments[1],
                { password: newPassword }
            );
            throwIfError(error);

            await recordAudit(
                client,
                admin,
                "administrator.password_reset",
                "admin_profile",
                segments[1]
            );

            return respond({
                success: true,
                message: "Administrator password reset successfully."
            });
        }
    }

    if (segments[0] === "clients") {
        if (method === "GET" && segments.length === 1) {
            requirePermission(admin, "posts_view");
            const { data, error } = await client
                .from("clients")
                .select("*")
                .order("created_at", { ascending: false });
            throwIfError(error);
            return respond({ success: true, clients: data });
        }

        if (method === "POST" && segments.length === 1) {
            requirePermission(admin, "posts_manage");
            const body = await readJson(request);
            const { data, error } = await client
                .from("clients")
                .insert({
                    client_name: body.client_name,
                    contact_person: body.contact_person || null,
                    phone: body.phone || null,
                    email: body.email || null,
                    address: body.address || null,
                    county: body.county || null,
                    business_type: body.business_type || null,
                    notes: body.notes || null,
                    status: body.status || "Active"
                })
                .select()
                .single();
            throwIfError(error);
                await recordAudit(
                    client,
                    admin,
                    "client.created",
                    "client",
                    data.id,
                    { client_name: data.client_name }
                );
                return respond({
                success: true,
                message: "Client added successfully.",
                client: data
            }, 201);
        }
    }

    if (segments[0] === "officers") {
        if (method === "GET" && segments.length === 1) {
            requirePermission(admin, "officers_view");
            const { data, error } = await client
                .from("officers")
                .select("*")
                .order("name");
            throwIfError(error);
            return respond({ success: true, officers: data });
        }

        if (method === "GET" && segments.length === 2) {
            requirePermission(admin, "officers_view");
            const officerId = segments[1];
            const { data: officer, error: officerError } = await client
                .from("officers")
                .select("*")
                .eq("officer_id", officerId)
                .maybeSingle();
            throwIfError(officerError);
            if (!officer) {
                throw new HttpError(404, "Officer not found.");
            }
            if (!officer.id) {
                throw new HttpError(
                    500,
                    "Officer record is missing its database identifier."
                );
            }

            const { data: assignments, error: assignmentsError } = await client
                .from("security_post_assignments")
                .select("*")
                .eq("officer_id", officer.id)
                .order("assigned_date", { ascending: false });
            throwIfError(assignmentsError);

            const postIds = [
                ...new Set((assignments || [])
                    .map(assignment => assignment.post_id)
                    .filter(Boolean))
            ];
            let postsById = new Map();
            if (postIds.length) {
                const { data: posts, error: postsError } = await client
                    .from("security_posts")
                    .select("id, post_name, location, county, status")
                    .in("id", postIds);
                throwIfError(postsError);
                postsById = new Map((posts || []).map(post => [post.id, post]));
            }

            return respond({
                success: true,
                officer,
                assignments: (assignments || []).map(assignment => ({
                    ...assignment,
                    post: postsById.get(assignment.post_id) || null
                }))
            });
        }

        if (method === "POST" && segments.length === 1) {
            requirePermission(admin, "officers_create");
            const body = await readJson(request);
            const officer = body.officer;

            if (!officer || typeof officer !== "object" || Array.isArray(officer)) {
                throw new HttpError(400, "Officer details are required.");
            }

            const { data: latest, error: latestError } = await client
                .from("officers")
                .select("officer_id")
                .like("officer_id", `VSG-${new Date().getFullYear()}-%`)
                .order("officer_id", { ascending: false })
                .limit(1);
            throwIfError(latestError);

            let nextNumber = 1;
            const match = latest?.[0]?.officer_id?.match(/(\d+)$/);
            if (match) {
                nextNumber = Number.parseInt(match[1], 10) + 1;
            }

            const officerId = `VSG-${new Date().getFullYear()}-${String(nextNumber).padStart(3, "0")}`;
            const { data, error } = await client
                .from("officers")
                .insert({
                    officer_id: officerId,
                    name: officer.name,
                    phone: officer.phone || null,
                    email: officer.email || null,
                    gender: officer.gender || null,
                    position: officer.position,
                    department: officer.department || null,
                    employment: officer.employment || null,
                    status: officer.status || "Verified Active",
                    issueDate: officer.issueDate || null,
                    expiryDate: officer.expiryDate || null,
                    photo: officer.photo || null,
                    qrCode: null
                })
                .select()
                .single();
            throwIfError(error);

            await recordAudit(
                client,
                admin,
                "officer.created",
                "officer",
                data.officer_id,
                { name: data.name }
            );

            return respond({
                success: true,
                message: "Officer added successfully.",
                officer: data
            }, 201);
        }

        if (method === "PATCH" && segments.length === 2) {
            requirePermission(admin, "officers_edit");
            const body = await readJson(request);
            const officer = body.officer;

            if (!officer || typeof officer !== "object" || Array.isArray(officer)) {
                throw new HttpError(400, "Officer details are required.");
            }

            const { data, error } = await client
                .from("officers")
                .update({
                    name: officer.name,
                    phone: officer.phone || null,
                    email: officer.email || null,
                    gender: officer.gender || null,
                    position: officer.position,
                    department: officer.department || null,
                    employment: officer.employment || null,
                    status: officer.status || "Verified Active",
                    issueDate: officer.issueDate || null,
                    expiryDate: officer.expiryDate || null,
                    photo: officer.photo || null,
                    updatedAt: new Date().toISOString()
                })
                .eq("officer_id", segments[1])
                .select()
                .single();
            throwIfError(error);

            await recordAudit(
                client,
                admin,
                "officer.updated",
                "officer",
                data.officer_id,
                { name: data.name }
            );

            return respond({
                success: true,
                message: "Officer updated successfully.",
                officer: data
            });
        }

        if (method === "DELETE" && segments.length === 2) {
            requirePermission(admin, "officers_delete");
            const { data, error } = await client
                .from("officers")
                .delete()
                .eq("officer_id", segments[1])
                .select("officer_id, name, photo")
                .single();
            throwIfError(error);

            await recordAudit(
                client,
                admin,
                "officer.deleted",
                "officer",
                data.officer_id,
                { name: data.name }
            );

            return respond({
                success: true,
                message: "Officer deleted successfully.",
                officer: data
            });
        }
    }

    if (segments[0] === "posts") {
        const postId = segments[1];

        if (method === "GET" && segments.length === 1) {
            requirePermission(admin, "posts_view");
            const { data, error } = await client
                .from("security_posts")
                .select(`
                    *,
                    clients (
                        id,
                        client_name,
                        contact_person,
                        phone,
                        email
                    )
                `)
                .order("created_at", { ascending: false });
            throwIfError(error);
            return respond({ success: true, posts: data });
        }

        if (method === "POST" && segments.length === 1) {
            requirePermission(admin, "posts_manage");
            const body = await readJson(request);
            const { data, error } = await client
                .from("security_posts")
                .insert({
                    client_id: body.client_id || null,
                    post_name: body.post_name,
                    location: body.location,
                    county: body.county || null,
                    required_officers: body.required_officers || 1,
                    shift_system: body.shift_system || "2 Shifts",
                    shift_one_start: body.shift_one_start || null,
                    shift_one_end: body.shift_one_end || null,
                    shift_two_start: body.shift_two_start || null,
                    shift_two_end: body.shift_two_end || null,
                    shift_three_start: body.shift_three_start || null,
                    shift_three_end: body.shift_three_end || null,
                    post_supervisor_id: body.post_supervisor_id || null,
                    service_start_date: body.service_start_date || null,
                    service_end_date: body.service_end_date || null,
                    status: body.status || "Active",
                    special_instructions: body.special_instructions || null
                })
                .select()
                .single();
            throwIfError(error);
            await recordAudit(
                client,
                admin,
                "security_post.created",
                "security_post",
                data.id,
                { post_name: data.post_name }
            );
            return respond({
                success: true,
                message: "Security post added successfully.",
                post: data
            }, 201);
        }

        if (method === "PATCH" && segments.length === 2) {
            requirePermission(admin, "posts_manage");
            const body = await readJson(request);
            const { data, error } = await client
                .from("security_posts")
                .update({
                    client_id: body.client_id || null,
                    post_name: body.post_name,
                    location: body.location,
                    county: body.county || null,
                    required_officers: body.required_officers || 1,
                    shift_system: body.shift_system || "2 Shifts",
                    shift_one_start: body.shift_one_start || null,
                    shift_one_end: body.shift_one_end || null,
                    shift_two_start: body.shift_two_start || null,
                    shift_two_end: body.shift_two_end || null,
                    shift_three_start: body.shift_three_start || null,
                    shift_three_end: body.shift_three_end || null,
                    post_supervisor_id: body.post_supervisor_id || null,
                    service_start_date: body.service_start_date || null,
                    service_end_date: body.service_end_date || null,
                    status: body.status || "Active",
                    special_instructions: body.special_instructions || null,
                    updated_at: new Date().toISOString()
                })
                .eq("id", postId)
                .select()
                .single();
            throwIfError(error);
            await recordAudit(
                client,
                admin,
                "security_post.updated",
                "security_post",
                postId,
                { post_name: data.post_name }
            );
            return respond({
                success: true,
                message: "Security post updated successfully.",
                post: data
            });
        }

        if (
            segments[2] === "assignments" &&
            method === "GET" &&
            segments.length === 3
        ) {
            requirePermission(admin, "posts_view");
            const { data, error } = await client
                .from("security_post_assignments")
                .select(`
                    *,
                    officers (
                        id,
                        officer_id,
                        name,
                        phone,
                        position,
                        department,
                        status
                    )
                `)
                .eq("post_id", postId)
                .order("shift_number", { ascending: true });
            throwIfError(error);
            return respond({ success: true, assignments: data });
        }

        if (
            segments[2] === "assignments" &&
            method === "POST" &&
            segments.length === 3
        ) {
            requirePermission(admin, "posts_manage");
            const body = await readJson(request);
            const { data, error } = await client
                .from("security_post_assignments")
                .insert({
                    post_id: postId,
                    officer_id: body.officer_id,
                    shift_number: body.shift_number,
                    assignment_status: body.assignment_status || "Active",
                    assigned_date: body.assigned_date ||
                        new Date().toISOString().split("T")[0],
                    end_date: body.end_date || null,
                    notes: body.notes || null
                })
                .select(`
                    *,
                    officers (
                        id,
                        officer_id,
                        name,
                        phone,
                        position,
                        department,
                        status
                    )
                `)
                .single();
            throwIfError(error);
            await recordAudit(
                client,
                admin,
                "assignment.created",
                "security_post_assignment",
                data.id,
                { post_id: postId, officer_id: data.officer_id }
            );
            return respond({
                success: true,
                message: "Officer assigned successfully.",
                assignment: data
            }, 201);
        }

        if (
            segments[2] === "assignments" &&
            method === "PATCH" &&
            segments.length === 4
        ) {
            requirePermission(admin, "posts_manage");
            const assignmentId = segments[3];
            const body = await readJson(request);
            const { data: existing, error: existingError } = await client
                .from("security_post_assignments")
                .select("id, post_id, officer_id")
                .eq("id", assignmentId)
                .single();
            throwIfError(existingError);

            const shiftNumber = Number(body.shift_number);
            if (!Number.isFinite(shiftNumber)) {
                throw new HttpError(400, "A valid shift number is required.");
            }

            const { data: duplicate, error: duplicateError } = await client
                .from("security_post_assignments")
                .select("id")
                .eq("post_id", existing.post_id)
                .eq("officer_id", existing.officer_id)
                .eq("shift_number", shiftNumber)
                .neq("id", assignmentId)
                .maybeSingle();
            throwIfError(duplicateError);

            if (duplicate) {
                throw new HttpError(
                    400,
                    "This officer is already assigned to this shift."
                );
            }

            const { data, error } = await client
                .from("security_post_assignments")
                .update({
                    shift_number: shiftNumber,
                    assignment_status: body.assignment_status || "Active",
                    assigned_date: body.assigned_date || null,
                    end_date: body.end_date || null,
                    notes: body.notes || null,
                    updated_at: new Date().toISOString()
                })
                .eq("id", assignmentId)
                .select(`
                    *,
                    officers (
                        id,
                        officer_id,
                        name,
                        phone,
                        position,
                        department,
                        status
                    )
                `)
                .single();
            throwIfError(error);
            await recordAudit(
                client,
                admin,
                "assignment.updated",
                "security_post_assignment",
                assignmentId,
                { post_id: data.post_id, officer_id: data.officer_id }
            );
            return respond({
                success: true,
                message: "Deployment updated successfully.",
                assignment: data
            });
        }

        if (
            segments[2] === "assignments" &&
            segments[4] === "end" &&
            method === "POST" &&
            segments.length === 5
        ) {
            requirePermission(admin, "posts_manage");
            const body = request.headers
                .get("content-type")
                ?.includes("application/json")
                ? await readJson(request)
                : {};
            const { data, error } = await client
                .from("security_post_assignments")
                .update({
                    assignment_status: "Ended",
                    end_date: body.end_date ||
                        new Date().toISOString().split("T")[0],
                    updated_at: new Date().toISOString()
                })
                .eq("id", segments[3])
                .select(`
                    *,
                    officers (
                        id,
                        officer_id,
                        name,
                        phone,
                        position,
                        department,
                        status
                    )
                `)
                .single();
            throwIfError(error);
            await recordAudit(
                client,
                admin,
                "assignment.ended",
                "security_post_assignment",
                segments[3],
                { post_id: postId, officer_id: data.officer_id }
            );
            return respond({
                success: true,
                message: "Deployment ended successfully.",
                assignment: data
            });
        }
    }

    throw new HttpError(404, "Admin API route not found.");
}

Deno.serve(async (request: Request) => {
    if (request.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
        console.error("Supabase Edge Function secrets are not configured.");
        return respond({
            success: false,
            message: "Supabase admin function configuration is incomplete."
        }, 500);
    }

    const client = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    try {
        const url = new URL(request.url);
        const path = url.searchParams.get("path") || "/";
        const segments = path
            .split("/")
            .filter(Boolean)
            .map(segment => decodeURIComponent(segment));
        const publicResponse = await handlePublicRequest(
            request,
            client,
            segments
        );

        if (publicResponse) {
            return publicResponse;
        }

        const admin = await authenticateAdmin(request, client);

        return await handleRequest(request, client, admin, segments);
    } catch (error) {
        if (error instanceof HttpError) {
            return respond({
                success: false,
                message: error.message
            }, error.status);
        }

        console.error("Supabase admin API request failed:", error);
        return respond({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Supabase admin API request failed."
        }, 500);
    }
});
