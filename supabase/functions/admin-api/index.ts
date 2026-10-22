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
    "co_ceo_photo_url",
    "cta_image_url"
]);

const ctaImagePageKeys = new Set([
    "home",
    "about",
    "services",
    "recruitment",
    "contact",
    "legal",
    "verification"
]);

const websiteTextLimits: Record<string, number> = {
    site_name: 160,
    contact_phone_numbers: 1200,
    contact_email: 254,
    contact_address: 500,
    contact_business_days: 180,
    contact_open_time: 5,
    contact_close_time: 5,
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
    "cta_image_enabled",
    "cta_image_pages",
    ...Object.keys(websiteTextLimits)
]);

const defaultPermissions: Record<string, Record<string, boolean>> = {
    "Super Admin": { all: true },
    "HR Admin": {
        messages_view: false,
        messages_manage: false,
        officers_view: true,
        officers_create: true,
        officers_edit: true,
        officers_delete: false,
        certificates_manage: true,
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
        messages_view: false,
        messages_manage: false,
        officers_view: true,
        officers_create: false,
        officers_edit: false,
        officers_delete: false,
        certificates_manage: false,
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
        messages_view: false,
        messages_manage: false,
        officers_view: true,
        officers_create: false,
        officers_edit: true,
        officers_delete: false,
        certificates_manage: false,
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
        messages_view: false,
        messages_manage: false,
        officers_view: true,
        officers_create: false,
        officers_edit: false,
        officers_delete: false,
        certificates_manage: false,
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
        messages_view: false,
        messages_manage: false,
        officers_view: false,
        officers_create: false,
        officers_edit: false,
        officers_delete: false,
        certificates_manage: false,
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

    if (
        permissions?.[permission] !== true &&
        !(
            permission === "certificates_manage" &&
            permissions?.[permission] === undefined &&
            defaultPermissions[String(admin.profile.role)]?.[permission] === true
        )
    ) {
        throw new HttpError(403, `Permission denied: ${permission}`);
    }
}

function requireAnyPermission(
    admin: AuthenticatedAdmin,
    permissions: string[]
) {
    const granted = admin.profile.permissions as
        | Record<string, unknown>
        | null;
    if (
        admin.profile.role === "Super Admin" ||
        granted?.all === true ||
        permissions.some(permission => granted?.[permission] === true)
    ) {
        return;
    }
    throw new HttpError(403, `Permission denied: ${permissions.join(" or ")}`);
}

function requireSuperAdmin(admin: AuthenticatedAdmin) {
    if (admin.profile.role !== "Super Admin") {
        throw new HttpError(403, "Super Admin access required.");
    }
}

function validateCertificateTemplate(configuration: JsonRecord) {
    if (
        typeof configuration.title !== "string" ||
        !configuration.title.trim() ||
        configuration.title.length > 100 ||
        typeof configuration.completion_statement !== "string" ||
        !configuration.completion_statement.trim() ||
        configuration.completion_statement.length > 500
    ) {
        throw new HttpError(400, "Provide a valid certificate title and completion statement.");
    }

    const allowedFonts = ["Arial", "Georgia", "Times New Roman"];
    if (
        (configuration.name_font !== undefined &&
            !allowedFonts.includes(String(configuration.name_font))) ||
        (configuration.body_font !== undefined &&
            !allowedFonts.includes(String(configuration.body_font)))
    ) {
        throw new HttpError(400, "Choose a supported certificate font.");
    }

    if (
        configuration.signatories !== undefined &&
        (!Array.isArray(configuration.signatories) ||
            configuration.signatories.length > 2 ||
            configuration.signatories.some((item: unknown) => {
                if (!item || typeof item !== "object" || Array.isArray(item)) {
                    return true;
                }
                const signatory = item as JsonRecord;
                return typeof signatory.enabled !== "boolean" ||
                    typeof signatory.name !== "string" ||
                    signatory.name.length > 160 ||
                    typeof signatory.title !== "string" ||
                    signatory.title.length > 160;
            }))
    ) {
        throw new HttpError(400, "Provide up to two valid certificate signatories.");
    }

    if (
        configuration.background_path !== undefined &&
        configuration.background_path !== "" &&
        (typeof configuration.background_path !== "string" ||
            !/^backgrounds\/[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(configuration.background_path))
    ) {
        throw new HttpError(400, "Certificate background asset path is invalid.");
    }

    const layout = configuration.layout;
    if (layout === undefined) {
        return;
    }
    const allowedFields = new Set([
        "title", "awarded", "recipient", "training",
        "statement", "completion", "certificateId"
    ]);
    if (!layout || typeof layout !== "object" || Array.isArray(layout)) {
        throw new HttpError(400, "Certificate field layout is invalid.");
    }
    for (const [field, rawPosition] of Object.entries(layout)) {
        if (!allowedFields.has(field) || !rawPosition ||
            typeof rawPosition !== "object" || Array.isArray(rawPosition)) {
            throw new HttpError(400, "Certificate field layout is invalid.");
        }
        const position = rawPosition as JsonRecord;
        const dimensions = ["x", "y", "width", "height"];
        if (dimensions.some(key => {
            const value = position[key];
            return typeof value !== "number" ||
                !Number.isFinite(value) ||
                value < 0 ||
                value > 100;
        })) {
            throw new HttpError(400, "Certificate field positions must be between 0 and 100.");
        }
        if (
            (position.font_size !== undefined &&
                (typeof position.font_size !== "number" ||
                    !Number.isFinite(position.font_size) ||
                    position.font_size < 8 || position.font_size > 72)) ||
            (position.font_family !== undefined &&
                !["Arial", "Georgia", "Times New Roman"].includes(String(position.font_family))) ||
            (position.font_weight !== undefined &&
                !["400", "600", "700", "800"].includes(String(position.font_weight))) ||
            (position.italic !== undefined && typeof position.italic !== "boolean") ||
            (position.visible !== undefined && typeof position.visible !== "boolean") ||
            (position.line_height !== undefined &&
                (typeof position.line_height !== "number" ||
                    !Number.isFinite(position.line_height) ||
                    position.line_height < 0.8 || position.line_height > 2.5)) ||
            (position.color !== undefined &&
                (typeof position.color !== "string" ||
                    !/^#[0-9a-f]{6}$/i.test(position.color))) ||
            (position.align !== undefined &&
                !["left", "center", "right"].includes(String(position.align)))
        ) {
            throw new HttpError(400, "Certificate field typography is invalid.");
        }
        if (
            Number(position.x) + Number(position.width) > 100 ||
            Number(position.y) + Number(position.height) > 100 ||
            Number(position.width) < 1 ||
            Number(position.height) < 1
        ) {
            throw new HttpError(400, "Certificate fields must remain inside the page.");
        }
    }
}

async function verifyCertificateAssetPaths(
    client: ReturnType<typeof createClient>,
    configuration: JsonRecord
) {
    const signatoryPaths = Array.isArray(configuration.signatories)
        ? configuration.signatories.map((item: unknown) => {
            if (!item || typeof item !== "object" || Array.isArray(item)) {
                return null;
            }
            const signatory = item as JsonRecord;
            return signatory.enabled === true ? signatory.signature_path : null;
        })
        : [];
    const paths = [
        configuration.background_path,
        ...signatoryPaths
    ].filter((path): path is string => typeof path === "string" && Boolean(path));

    for (const path of paths) {
        const { error } = await client.storage
            .from("vsg-certificate-assets")
            .createSignedUrl(path, 60);
        if (error) {
            throw new HttpError(400, "A referenced certificate asset is unavailable.");
        }
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

function recruitmentStoragePath(
    fileUrl: string | null,
    bucket: string,
    applicationId: string
): string | null {
    if (!fileUrl) {
        return null;
    }

    let url: URL;
    try {
        url = new URL(fileUrl);
    } catch {
        throw new HttpError(500, "An application file has an invalid URL.");
    }

    const prefix = `/storage/v1/object/public/${bucket}/`;
    if (!url.pathname.startsWith(prefix)) {
        throw new HttpError(
            500,
            `An application file is not stored in the expected ${bucket} bucket.`
        );
    }

    let objectPath: string;
    try {
        objectPath = decodeURIComponent(url.pathname.slice(prefix.length));
    } catch {
        throw new HttpError(500, "An application file has an invalid storage path.");
    }

    if (!objectPath.startsWith(`${applicationId}/`)) {
        throw new HttpError(
            500,
            "An application file is outside its application storage folder."
        );
    }

    return objectPath;
}

function galleryStoragePath(fileUrl: string | null | undefined): string | null {
    if (!fileUrl) {
        return null;
    }

    let url: URL;
    try {
        url = new URL(fileUrl);
    } catch {
        throw new HttpError(400, "Gallery media URL is invalid.");
    }

    const storageUrl = Deno.env.get("SUPABASE_URL");
    if (!storageUrl || url.origin !== new URL(storageUrl).origin) {
        throw new HttpError(400, "Gallery media must be stored in the VAST gallery bucket.");
    }

    const prefix = "/storage/v1/object/public/vsg-gallery-assets/";
    if (!url.pathname.startsWith(prefix)) {
        throw new HttpError(400, "Gallery media must be stored in the VAST gallery bucket.");
    }

    let objectPath: string;
    try {
        objectPath = decodeURIComponent(url.pathname.slice(prefix.length));
    } catch {
        throw new HttpError(400, "Gallery media URL is invalid.");
    }

    if (!objectPath || objectPath.includes("..")) {
        throw new HttpError(400, "Gallery media storage path is invalid.");
    }

    return objectPath;
}

function isValidGalleryDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value;
}

function galleryText(value: unknown, field: string): string {
    if (typeof value !== "string") {
        throw new HttpError(400, `${field} must be text.`);
    }

    return value.trim();
}

async function removeGalleryAssets(
    client: ReturnType<typeof createClient>,
    urls: Array<string | null | undefined>
) {
    const paths = [...new Set(urls
        .map(url => galleryStoragePath(url))
        .filter((path): path is string => Boolean(path)))];
    if (!paths.length) {
        return;
    }

    const { error } = await client.storage
        .from("vsg-gallery-assets")
        .remove(paths);
    if (error) {
        console.error("Unable to remove replaced gallery media:", error);
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
        segments[1] === "gallery"
    ) {
        const { data, error } = await client
            .from("vsg_gallery_items")
            .select("id, title, event_date, preview, caption, event_details, message, media_type, media_url, cover_image_url")
            .eq("is_published", true)
            .order("event_date", { ascending: false })
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Unable to load public gallery:", error);
            throw new HttpError(500, "Unable to load the VAST gallery.");
        }

        return respond({ success: true, items: data || [] });
    }

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
        if (!/^[A-Z0-9]{2,12}-\d{4}-\d{3,}$/.test(officerId)) {
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
        segments.length === 3 &&
        segments[0] === "public" &&
        segments[1] === "certificates"
    ) {
        const certificateId = segments[2].toUpperCase();
        if (!/^VSG-TRN-\d{4}-\d{3,}$/.test(certificateId)) {
            throw new HttpError(400, "Enter a valid VAST Certificate ID.");
        }

        const { data, error } = await client
            .from("vsg_certificates")
            .select("certificate_id, status, issued_at, revoked_at, revocation_reason, snapshot")
            .eq("certificate_id", certificateId)
            .in("status", ["Issued", "Revoked"])
            .maybeSingle();

        if (error) {
            console.error("Unable to verify public certificate:", error);
            throw new HttpError(500, "Unable to verify this certificate right now.");
        }
        if (!data) {
            throw new HttpError(404, "No officially issued certificate was found with that ID.");
        }

        const snapshot = data.snapshot && typeof data.snapshot === "object"
            ? data.snapshot as JsonRecord
            : {};
        const rawSignatories = Array.isArray(snapshot.signatories)
            ? snapshot.signatories
            : [];
        const signatories = rawSignatories
            .filter((item): item is JsonRecord =>
                Boolean(item) && typeof item === "object" && !Array.isArray(item)
            )
            .filter(item => item.enabled === true)
            .map(async item => {
                const path = typeof item.signature_path === "string"
                    ? item.signature_path
                    : "";
                let signatureUrl: string | null = null;
                if (path && path.startsWith("signatures/")) {
                    const { data: signed, error: signedError } = await client.storage
                        .from("vsg-certificate-assets")
                        .createSignedUrl(path, 3600);
                    if (signedError) {
                        console.error("Unable to create a public certificate signature URL:", signedError);
                        throw new HttpError(500, "Unable to display this certificate right now.");
                    }
                    signatureUrl = signed.signedUrl;
                }
                return {
                    name: typeof item.name === "string" ? item.name : "",
                    title: typeof item.title === "string" ? item.title : "",
                    signature_url: signatureUrl
                };
            });
        const publicSignatories = await Promise.all(signatories);
        const templateConfiguration = snapshot.template_configuration &&
            typeof snapshot.template_configuration === "object"
            ? snapshot.template_configuration as JsonRecord
            : {};
        let backgroundUrl: string | null = null;
        const backgroundPath = typeof templateConfiguration.background_path === "string"
            ? templateConfiguration.background_path
            : "";
        if (backgroundPath.startsWith("backgrounds/")) {
            const { data: signed, error: signedError } = await client.storage
                .from("vsg-certificate-assets")
                .createSignedUrl(backgroundPath, 3600);
            if (signedError) {
                console.error("Unable to create a public certificate background URL:", signedError);
                throw new HttpError(500, "Unable to display this certificate right now.");
            }
            backgroundUrl = signed.signedUrl;
        }

        return respond({
            success: true,
            certificate: {
                certificate_id: data.certificate_id,
                status: data.status,
                issued_at: data.issued_at,
                revoked_at: data.revoked_at,
                revocation_message: data.status === "Revoked"
                    ? "This certificate has been revoked by VAST Security Group."
                    : null,
                snapshot: {
                    officer_name: snapshot.officer_name,
                    program_name: snapshot.program_name,
                    duration_hours: snapshot.duration_hours,
                    batch_name: snapshot.batch_name,
                    start_date: snapshot.start_date,
                    completion_date: snapshot.completion_date,
                    completion_statement: snapshot.completion_statement,
                    title: snapshot.title,
                    name_font: snapshot.name_font,
                    body_font: snapshot.body_font,
                    layout: snapshot.layout,
                    signatories: publicSignatories,
                    background_url: backgroundUrl
                }
            }
        });
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
        if (
            method === "GET" &&
            segments.length === 3 &&
            segments[1] === "page"
        ) {
            const page = Number.parseInt(segments[2], 10);
            if (!Number.isSafeInteger(page) || page < 1) {
                throw new HttpError(400, "A valid notification page is required.");
            }
            const pageSize = 30;
            const from = (page - 1) * pageSize;
            const [
                { data, error },
                { count, error: countError },
                { count: unreadCount, error: unreadError }
            ] = await Promise.all([
                client
                    .from("vsg_admin_notifications")
                    .select(
                        "id, notification_type, title, body, target_path, entity_id, created_at, read_at",
                        { count: "exact" }
                    )
                    .eq("admin_user_id", admin.user.id)
                    .order("created_at", { ascending: false })
                    .range(from, from + pageSize - 1),
                client
                    .from("vsg_admin_notifications")
                    .select("id", { count: "exact", head: true })
                    .eq("admin_user_id", admin.user.id),
                client
                    .from("vsg_admin_notifications")
                    .select("id", { count: "exact", head: true })
                    .eq("admin_user_id", admin.user.id)
                    .is("read_at", null)
            ]);
            throwIfError(error);
            throwIfError(countError);
            throwIfError(unreadError);

            return respond({
                success: true,
                notifications: data || [],
                unreadCount: unreadCount || 0,
                totalCount: count || 0,
                page,
                pageSize
            });
        }

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
        if (method === "GET" && segments.length === 1) {
            requireAnyPermission(admin, ["messages_view", "messages_manage"]);
            const { data, error } = await client
                .from("vsg_contact_messages")
                .select("id, name, email, phone, subject, message, status, is_read, created_at, updated_at")
                .order("created_at", { ascending: false })
                .limit(500);
            if (error) {
                console.error("Unable to retrieve contact messages:", error);
                throw new HttpError(500, "Unable to load contact messages.");
            }
            return respond({ success: true, messages: data });
        }

        if (method === "PATCH" && segments.length === 2) {
            const body = await readJson(request);
            const hasStatus = body.status !== undefined;
            const hasReadStatus = body.is_read !== undefined;
            if (!hasStatus && !hasReadStatus) {
                throw new HttpError(400, "Provide a workflow status or read status to update.");
            }
            if (hasStatus && !["New", "In Progress", "Resolved"].includes(body.status as string)) {
                throw new HttpError(400, "Invalid message status.");
            }
            if (hasReadStatus && typeof body.is_read !== "boolean") {
                throw new HttpError(400, "Read status must be true or false.");
            }
            if (hasReadStatus) {
                requirePermission(admin, "messages_manage");
            } else {
                requireAnyPermission(admin, ["messages_view", "messages_manage"]);
            }

            const updates: JsonRecord = {
                updated_at: new Date().toISOString()
            };
            if (hasStatus) {
                updates.status = body.status;
            }
            if (hasReadStatus) {
                updates.is_read = body.is_read;
            }

            const { data, error } = await client
                .from("vsg_contact_messages")
                .update(updates)
                .eq("id", segments[1])
                .select("id, status, is_read, updated_at")
                .single();
            if (error) {
                console.error("Unable to update contact message:", error);
                throwIfError(error);
            }
            await recordAudit(
                client,
                admin,
                "message.updated",
                "contact_message",
                segments[1],
                {
                    fields: Object.keys(updates).filter(key => key !== "updated_at"),
                    status: data.status,
                    is_read: data.is_read
                }
            );
            return respond({
                success: true,
                message: "Contact message updated.",
                contactMessage: data
            });
        }

        if (method === "DELETE" && segments.length === 2) {
            requirePermission(admin, "messages_manage");
            const { data, error } = await client
                .from("vsg_contact_messages")
                .delete()
                .eq("id", segments[1])
                .select("id")
                .single();
            if (error) {
                console.error("Unable to delete contact message:", error);
                throwIfError(error);
            }
            await recordAudit(
                client,
                admin,
                "message.deleted",
                "contact_message",
                data.id,
                {}
            );
            return respond({
                success: true,
                message: "Contact message deleted."
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
                    if (
                        key === "cta_image_url" &&
                        value &&
                        !value.startsWith(`${imageUrlPrefix}cta_image_url/`)
                    ) {
                        throw new HttpError(400, "CTA images must be uploaded through the CTA image manager.");
                    }
                    return {
                        content_key: key,
                        content_value: value,
                        updated_at: new Date().toISOString()
                    };
                }

                if (key === "cta_image_enabled") {
                    if (value !== "true" && value !== "false") {
                        throw new HttpError(400, "CTA image enabled must be true or false.");
                    }
                    return {
                        content_key: key,
                        content_value: value,
                        updated_at: new Date().toISOString()
                    };
                }

                if (key === "cta_image_pages") {
                    let requestedPages: unknown;
                    try {
                        requestedPages = JSON.parse(value);
                    } catch {
                        throw new HttpError(400, "CTA image page settings must be valid JSON.");
                    }
                    if (
                        !requestedPages ||
                        typeof requestedPages !== "object" ||
                        Array.isArray(requestedPages)
                    ) {
                        throw new HttpError(400, "CTA image page settings must be an object.");
                    }

                    const pageSettingsInput =
                        requestedPages as Record<string, unknown>;
                    const requestedEntries = Object.entries(pageSettingsInput);
                    if (requestedEntries.some(([page, visible]) =>
                        !ctaImagePageKeys.has(page) || typeof visible !== "boolean"
                    )) {
                        throw new HttpError(400, "CTA image page settings contain an invalid page or visibility value.");
                    }

                    const pageSettings = Object.fromEntries(
                        [...ctaImagePageKeys].map(page => [
                            page,
                            pageSettingsInput[page] === true
                        ])
                    );
                    return {
                        content_key: key,
                        content_value: JSON.stringify(pageSettings),
                        updated_at: new Date().toISOString()
                    };
                }

                if (
                    key === "contact_email" &&
                    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
                ) {
                    throw new HttpError(400, "Enter a valid public contact email address.");
                }

                if (
                    key === "contact_phone_numbers" &&
                    value.split(/\r?\n/).some(number =>
                        number.trim() &&
                        !/^\+?[0-9][0-9 ()-]{4,29}$/.test(number.trim())
                    )
                ) {
                    throw new HttpError(400, "Enter one valid telephone number per line.");
                }

                if (
                    (key === "contact_open_time" || key === "contact_close_time") &&
                    !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)
                ) {
                    throw new HttpError(400, "Business hours must use a valid 24-hour time.");
                }

                if (
                    [
                        "contact_email",
                        "contact_address",
                        "contact_business_days",
                        "contact_open_time",
                        "contact_close_time"
                    ].includes(key) &&
                    !value.trim()
                ) {
                    throw new HttpError(400, `${key.replaceAll("_", " ")} is required.`);
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

    if (segments[0] === "gallery") {
        requirePermission(admin, "settings_manage");

        if (method === "DELETE" && segments.length === 2 && segments[1] === "assets") {
            const body = await readJson(request);
            if (
                !Array.isArray(body.asset_urls) ||
                body.asset_urls.length > 20 ||
                body.asset_urls.some(url => typeof url !== "string")
            ) {
                throw new HttpError(400, "Provide valid gallery asset URLs to clean up.");
            }

            const unusedPaths: string[] = [];
            for (const url of new Set(body.asset_urls as string[])) {
                const objectPath = galleryStoragePath(url);
                if (!objectPath ||
                    (!objectPath.startsWith("media/") && !objectPath.startsWith("cover/"))) {
                    throw new HttpError(400, "Gallery asset path is invalid.");
                }
                const { data: mediaReference, error: mediaError } = await client
                    .from("vsg_gallery_items")
                    .select("id")
                    .eq("media_url", url)
                    .maybeSingle();
                throwIfError(mediaError);
                const { data: coverReference, error: coverError } = await client
                    .from("vsg_gallery_items")
                    .select("id")
                    .eq("cover_image_url", url)
                    .maybeSingle();
                throwIfError(coverError);
                if (!mediaReference && !coverReference) {
                    unusedPaths.push(objectPath);
                }
            }

            if (unusedPaths.length) {
                const { error } = await client.storage
                    .from("vsg-gallery-assets")
                    .remove(unusedPaths);
                if (error) {
                    console.error("Unable to remove unreferenced gallery uploads:", error);
                    throw new HttpError(500, "Unable to clean up unused gallery uploads.");
                }
            }
            return respond({ success: true, removed: unusedPaths.length });
        }

        if (method === "GET" && segments.length === 1) {
            const { data, error } = await client
                .from("vsg_gallery_items")
                .select("*")
                .order("event_date", { ascending: false })
                .order("created_at", { ascending: false });
            throwIfError(error);
            return respond({ success: true, items: data || [] });
        }

        if (method === "POST" && segments.length === 2 && segments[1] === "assets") {
            const body = await readJson(request);
            const kind = body.kind;
            const contentType = body.content_type;
            const size = body.size;
            if (
                (kind !== "media" && kind !== "cover") ||
                typeof contentType !== "string" ||
                typeof size !== "number" ||
                !Number.isSafeInteger(size) ||
                size <= 0
            ) {
                throw new HttpError(400, "Choose a valid gallery media or cover image.");
            }

            const extensionByType: Record<string, string> = {
                "image/jpeg": "jpg",
                "image/png": "png",
                "image/webp": "webp",
                "video/mp4": "mp4",
                "video/webm": "webm",
                "video/quicktime": "mov"
            };
            const extension = extensionByType[contentType];
            if (!extension || (kind === "cover" && !contentType.startsWith("image/"))) {
                throw new HttpError(
                    400,
                    kind === "cover"
                        ? "Use a JPEG, PNG, or WebP cover image."
                        : "Use a JPEG, PNG, WebP, MP4, WebM, or MOV media file."
                );
            }

            const maxSize = kind === "cover"
                ? 10 * 1024 * 1024
                : contentType.startsWith("video/")
                    ? 100 * 1024 * 1024
                    : 10 * 1024 * 1024;
            if (size > maxSize) {
                throw new HttpError(
                    400,
                    kind === "cover"
                        ? "Cover images must be no larger than 10 MB."
                        : contentType.startsWith("video/")
                            ? "Videos must be no larger than 100 MB."
                            : "Images must be no larger than 10 MB."
                );
            }

            const objectPath = `${kind}/${crypto.randomUUID()}.${extension}`;
            await recordAudit(
                client,
                admin,
                "gallery.asset_upload_authorized",
                "gallery_item",
                null,
                { kind, path: objectPath, size, content_type: contentType }
            );

            return respond({
                success: true,
                objectPath,
                mediaType: contentType.startsWith("video/") ? "video" : "image"
            }, 201);
        }

        if (method === "POST" && segments.length === 1) {
            const body = await readJson(request);
            const title = galleryText(body.title ?? "", "Title");
            const eventDate = typeof body.event_date === "string"
                ? body.event_date
                : "";
            const mediaType = body.media_type;
            const preview = galleryText(body.preview ?? "", "Preview");
            const caption = galleryText(body.caption ?? "", "Caption");
            const eventDetails = galleryText(body.event_details ?? "", "Event details");
            const message = galleryText(body.message ?? "", "Message");
            const mediaUrl = typeof body.media_url === "string" ? body.media_url : "";
            const coverImageUrl = typeof body.cover_image_url === "string"
                ? body.cover_image_url
                : "";
            const clientRequestId = body.client_request_id;

            if (
                !title || title.length > 180 ||
                !isValidGalleryDate(eventDate) ||
                (mediaType !== "image" && mediaType !== "video") ||
                !preview || preview.length > 500 ||
                caption.length > 5000 ||
                eventDetails.length > 10000 ||
                message.length > 20000 ||
                (body.is_published !== undefined &&
                    typeof body.is_published !== "boolean") ||
                (clientRequestId !== undefined &&
                    (typeof clientRequestId !== "string" ||
                        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clientRequestId)))
            ) {
                throw new HttpError(400, "Enter valid gallery details and required media.");
            }

            const mediaPath = galleryStoragePath(mediaUrl);
            const coverPath = coverImageUrl
                ? galleryStoragePath(coverImageUrl)
                : null;
            if (
                !mediaPath?.startsWith("media/") ||
                (coverPath && !coverPath.startsWith("cover/")) ||
                (mediaType === "video" && !coverPath)
            ) {
                throw new HttpError(
                    400,
                    "Upload the gallery media and provide a cover image for video items."
                );
            }

            if (typeof clientRequestId === "string") {
                const { data: previous, error: previousError } = await client
                    .from("vsg_gallery_items")
                    .select("*")
                    .eq("client_request_id", clientRequestId)
                    .maybeSingle();
                throwIfError(previousError);
                if (previous) {
                    if (previous.created_by !== admin.user.id) {
                        throw new HttpError(409, "This gallery submission identifier is already in use.");
                    }
                    return respond({ success: true, item: previous });
                }
            }

            const { data, error } = await client
                .from("vsg_gallery_items")
                .insert({
                    title,
                    event_date: eventDate,
                    preview,
                    caption,
                    event_details: eventDetails,
                    message,
                    media_type: mediaType,
                    media_url: mediaUrl,
                    cover_image_url: coverImageUrl || null,
                    is_published: body.is_published !== false,
                    client_request_id: clientRequestId || null,
                    created_by: admin.user.id
                })
                .select()
                .single();
            if (error?.code === "23505" && typeof clientRequestId === "string") {
                const { data: previous, error: previousError } = await client
                    .from("vsg_gallery_items")
                    .select("*")
                    .eq("client_request_id", clientRequestId)
                    .maybeSingle();
                throwIfError(previousError);
                if (previous?.created_by === admin.user.id) {
                    return respond({ success: true, item: previous });
                }
                if (previous) {
                    throw new HttpError(409, "This gallery submission identifier is already in use.");
                }
            }
            throwIfError(error);

            await recordAudit(
                client,
                admin,
                "gallery_item.created",
                "gallery_item",
                data.id,
                { title: data.title, is_published: data.is_published }
            );
            return respond({ success: true, item: data }, 201);
        }

        if (method === "PATCH" && segments.length === 2) {
            const itemId = segments[1];
            const body = await readJson(request);
            const { data: existing, error: existingError } = await client
                .from("vsg_gallery_items")
                .select("*")
                .eq("id", itemId)
                .maybeSingle();
            throwIfError(existingError);
            if (!existing) {
                throw new HttpError(404, "Gallery item not found.");
            }

            const field = (key: string) =>
                body[key] === undefined ? existing[key] : body[key];
            const title = galleryText(field("title"), "Title");
            const eventDate = field("event_date");
            const mediaType = field("media_type");
            const preview = galleryText(field("preview"), "Preview");
            const caption = galleryText(field("caption"), "Caption");
            const eventDetails = galleryText(field("event_details"), "Event details");
            const message = galleryText(field("message"), "Message");
            const mediaUrl = field("media_url");
            const coverImageUrl = field("cover_image_url");
            const isPublished = field("is_published");

            if (
                !title || title.length > 180 ||
                typeof eventDate !== "string" ||
                !isValidGalleryDate(eventDate) ||
                (mediaType !== "image" && mediaType !== "video") ||
                !preview || preview.length > 500 ||
                caption.length > 5000 ||
                eventDetails.length > 10000 ||
                message.length > 20000 ||
                typeof mediaUrl !== "string" ||
                (coverImageUrl !== null && typeof coverImageUrl !== "string") ||
                typeof isPublished !== "boolean"
            ) {
                throw new HttpError(400, "Enter valid gallery details and required media.");
            }

            const mediaPath = galleryStoragePath(mediaUrl);
            const coverPath = coverImageUrl
                ? galleryStoragePath(coverImageUrl)
                : null;
            if (
                !mediaPath?.startsWith("media/") ||
                (coverPath && !coverPath.startsWith("cover/")) ||
                (mediaType === "video" && !coverPath)
            ) {
                throw new HttpError(400, "Gallery media or its video cover is invalid.");
            }

            const { data, error } = await client
                .from("vsg_gallery_items")
                .update({
                    title,
                    event_date: eventDate,
                    preview,
                    caption,
                    event_details: eventDetails,
                    message,
                    media_type: mediaType,
                    media_url: mediaUrl,
                    cover_image_url: coverImageUrl || null,
                    is_published: isPublished,
                    updated_at: new Date().toISOString()
                })
                .eq("id", itemId)
                .select()
                .single();
            throwIfError(error);

            if (
                existing.media_url !== data.media_url ||
                existing.cover_image_url !== data.cover_image_url
            ) {
                await removeGalleryAssets(client, [
                    existing.media_url !== data.media_url ? existing.media_url : null,
                    existing.cover_image_url !== data.cover_image_url
                        ? existing.cover_image_url
                        : null
                ]);
            }

            await recordAudit(
                client,
                admin,
                "gallery_item.updated",
                "gallery_item",
                itemId,
                { title: data.title, is_published: data.is_published }
            );
            return respond({ success: true, item: data });
        }

        if (method === "DELETE" && segments.length === 2) {
            const itemId = segments[1];
            const { data, error } = await client
                .from("vsg_gallery_items")
                .delete()
                .eq("id", itemId)
                .select("id, title, media_url, cover_image_url")
                .single();
            throwIfError(error);
            await removeGalleryAssets(client, [data.media_url, data.cover_image_url]);
            await recordAudit(
                client,
                admin,
                "gallery_item.deleted",
                "gallery_item",
                itemId,
                { title: data.title }
            );
            return respond({ success: true, message: "Gallery item deleted." });
        }
    }

    if (segments[0] === "officer-id-settings") {
        requirePermission(admin, "settings_manage");

        if (method === "GET" && segments.length === 1) {
            const { data, error } = await client
                .from("vsg_website_content")
                .select("content_value")
                .eq("content_key", "officer_id_prefix")
                .maybeSingle();
            throwIfError(error);

            return respond({
                success: true,
                prefix: data?.content_value || "VSG"
            });
        }

        if (method === "PATCH" && segments.length === 1) {
            const body = await readJson(request);
            if (
                typeof body.prefix !== "string" ||
                !/^[A-Za-z0-9]{2,12}$/.test(body.prefix.trim())
            ) {
                throw new HttpError(
                    400,
                    "Officer ID prefixes must contain 2 to 12 letters or numbers."
                );
            }

            const prefix = body.prefix.trim().toUpperCase();
            const { error } = await client
                .from("vsg_website_content")
                .upsert({
                    content_key: "officer_id_prefix",
                    content_value: prefix,
                    updated_at: new Date().toISOString()
                }, { onConflict: "content_key" });
            throwIfError(error);

            await recordAudit(
                client,
                admin,
                "officer_id.prefix_updated",
                "officer_id_settings",
                null,
                { prefix }
            );

            return respond({
                success: true,
                message: "Officer ID prefix updated.",
                prefix
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

        if (method === "PATCH" && segments.length === 2) {
            requirePermission(admin, "posts_manage");
            const body = await readJson(request);
            const { data, error } = await client
                .from("clients")
                .update({
                    client_name: body.client_name,
                    contact_person: body.contact_person || null,
                    phone: body.phone || null,
                    email: body.email || null,
                    address: body.address || null,
                    county: body.county || null,
                    business_type: body.business_type || null,
                    notes: body.notes || null,
                    status: body.status || "Active",
                    updated_at: new Date().toISOString()
                })
                .eq("id", segments[1])
                .select()
                .single();
            throwIfError(error);

            await recordAudit(
                client,
                admin,
                "client.updated",
                "client",
                data.id,
                { client_name: data.client_name }
            );

            return respond({
                success: true,
                message: "Client updated successfully.",
                client: data
            });
        }
    }

    if (
        segments[0] === "recruitment-applications" &&
        method === "DELETE" &&
        segments.length === 2
    ) {
        requirePermission(admin, "recruitment_manage");
        const applicationId = segments[1];
        if (
            !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
                .test(applicationId)
        ) {
            throw new HttpError(400, "Invalid application ID.");
        }

        const { data: application, error: applicationError } = await client
            .from("recruitment_applications")
            .select("id, full_name, photo_url")
            .eq("id", applicationId)
            .maybeSingle();
        throwIfError(applicationError);
        if (!application) {
            throw new HttpError(404, "Application not found.");
        }

        const { data: documents, error: documentsError } = await client
            .from("recruitment_documents")
            .select("file_url")
            .eq("application_id", applicationId);
        throwIfError(documentsError);

        const filesByBucket = new Map<string, string[]>();
        const photoPath = recruitmentStoragePath(
            application.photo_url,
            "recruitment-photos",
            applicationId
        );
        if (photoPath) {
            filesByBucket.set("recruitment-photos", [photoPath]);
        }

        for (const document of documents || []) {
            const objectPath = recruitmentStoragePath(
                document.file_url,
                "recruitment-documents",
                applicationId
            );
            if (objectPath) {
                const paths = filesByBucket.get("recruitment-documents") || [];
                paths.push(objectPath);
                filesByBucket.set("recruitment-documents", paths);
            }
        }

        for (const [bucket, paths] of filesByBucket) {
            const { error } = await client.storage.from(bucket).remove(paths);
            if (error) {
                console.error(
                    `Unable to remove files for application ${applicationId}:`,
                    error
                );
                throw new HttpError(
                    500,
                    "Unable to remove the application's uploaded files."
                );
            }
        }

        const { error: deleteError } = await client
            .from("recruitment_applications")
            .delete()
            .eq("id", applicationId);
        throwIfError(deleteError);

        await recordAudit(
            client,
            admin,
            "recruitment_application.deleted",
            "recruitment_application",
            applicationId,
            { full_name: application.full_name }
        );

        return respond({
            success: true,
            message: "Application and uploaded files deleted."
        });
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

            const { data: prefixSetting, error: prefixError } = await client
                .from("vsg_website_content")
                .select("content_value")
                .eq("content_key", "officer_id_prefix")
                .maybeSingle();
            throwIfError(prefixError);
            const prefix = prefixSetting?.content_value || "VSG";
            const year = new Date().getFullYear();

            const { data: latest, error: latestError } = await client
                .from("officers")
                .select("officer_id")
                .like("officer_id", `${prefix}-${year}-%`)
                .order("officer_id", { ascending: false })
                .limit(1);
            throwIfError(latestError);

            let nextNumber = 1;
            const match = latest?.[0]?.officer_id?.match(/(\d+)$/);
            if (match) {
                nextNumber = Number.parseInt(match[1], 10) + 1;
            }

            const officerId = `${prefix}-${year}-${String(nextNumber).padStart(3, "0")}`;
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
            const { data: existingPost, error: existingPostError } = await client
                .from("security_posts")
                .select("*")
                .eq("id", postId)
                .maybeSingle();
            throwIfError(existingPostError);
            if (!existingPost) {
                throw new HttpError(404, "Security post not found.");
            }

            const valueOrExisting = (key: string) =>
                body[key] === undefined ? existingPost[key] : body[key] || null;
            const { data, error } = await client
                .from("security_posts")
                .update({
                    client_id: valueOrExisting("client_id"),
                    post_name: valueOrExisting("post_name"),
                    location: valueOrExisting("location"),
                    county: valueOrExisting("county"),
                    required_officers: body.required_officers === undefined
                        ? existingPost.required_officers
                        : Number(body.required_officers) || 1,
                    shift_system: valueOrExisting("shift_system"),
                    shift_one_start: valueOrExisting("shift_one_start"),
                    shift_one_end: valueOrExisting("shift_one_end"),
                    shift_two_start: valueOrExisting("shift_two_start"),
                    shift_two_end: valueOrExisting("shift_two_end"),
                    shift_three_start: valueOrExisting("shift_three_start"),
                    shift_three_end: valueOrExisting("shift_three_end"),
                    post_supervisor_id: valueOrExisting("post_supervisor_id"),
                    service_start_date: valueOrExisting("service_start_date"),
                    service_end_date: valueOrExisting("service_end_date"),
                    status: valueOrExisting("status"),
                    special_instructions: valueOrExisting("special_instructions"),
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

    if (segments[0] === "training") {
        requirePermission(admin, "certificates_manage");

        if (method === "GET" && segments.length === 2 && segments[1] === "programs") {
            const { data, error } = await client
                .from("vsg_training_programs")
                .select("*")
                .order("created_at", { ascending: false });
            throwIfError(error);
            return respond({ success: true, programs: data || [] });
        }

        if (method === "POST" && segments.length === 2 && segments[1] === "programs") {
            const body = await readJson(request);
            const name = typeof body.name === "string" ? body.name.trim() : "";
            const durationHours = Number(body.duration_hours);
            if (!name || name.length > 160 || !Number.isFinite(durationHours) ||
                durationHours <= 0 || durationHours > 100000) {
                throw new HttpError(400, "Provide a valid program name and training duration.");
            }
            const { data, error } = await client
                .from("vsg_training_programs")
                .insert({
                    name,
                    duration_hours: durationHours,
                    description: typeof body.description === "string"
                        ? body.description.trim().slice(0, 4000) || null
                        : null,
                    certificate_template_id: typeof body.certificate_template_id === "string"
                        ? body.certificate_template_id
                        : null,
                    created_by: admin.user.id
                })
                .select()
                .single();
            throwIfError(error);
            await recordAudit(client, admin, "training_program.created", "training_program", data.id, {
                name: data.name
            });
            return respond({ success: true, program: data }, 201);
        }

        if (method === "PATCH" && segments.length === 3 && segments[1] === "programs") {
            const body = await readJson(request);
            const updates: JsonRecord = { updated_at: new Date().toISOString() };
            if (body.name !== undefined) {
                if (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 160) {
                    throw new HttpError(400, "Provide a valid program name.");
                }
                updates.name = body.name.trim();
            }
            if (body.duration_hours !== undefined) {
                const hours = Number(body.duration_hours);
                if (!Number.isFinite(hours) || hours <= 0 || hours > 100000) {
                    throw new HttpError(400, "Provide a valid training duration.");
                }
                updates.duration_hours = hours;
            }
            if (body.description !== undefined) {
                if (typeof body.description !== "string" || body.description.length > 4000) {
                    throw new HttpError(400, "Program description is too long.");
                }
                updates.description = body.description.trim() || null;
            }
            if (body.certificate_template_id !== undefined) {
                updates.certificate_template_id = body.certificate_template_id || null;
            }
            if (body.is_active !== undefined) {
                if (typeof body.is_active !== "boolean") {
                    throw new HttpError(400, "Program active status must be true or false.");
                }
                updates.is_active = body.is_active;
            }
            if (Object.keys(updates).length === 1) {
                throw new HttpError(400, "No program changes were provided.");
            }
            const { data, error } = await client
                .from("vsg_training_programs")
                .update(updates)
                .eq("id", segments[2])
                .select()
                .single();
            throwIfError(error);
            await recordAudit(client, admin, "training_program.updated", "training_program", data.id, {
                fields: Object.keys(updates).filter(key => key !== "updated_at")
            });
            return respond({ success: true, program: data });
        }

        if (method === "GET" && segments.length === 2 && segments[1] === "batches") {
            const { data, error } = await client
                .from("vsg_training_batches")
                .select("*, program:vsg_training_programs(id, name, duration_hours)")
                .order("start_date", { ascending: false });
            throwIfError(error);
            return respond({ success: true, batches: data || [] });
        }

        if (method === "POST" && segments.length === 2 && segments[1] === "batches") {
            const body = await readJson(request);
            const name = typeof body.name === "string" ? body.name.trim() : "";
            const startDate = typeof body.start_date === "string" ? body.start_date : "";
            if (!name || name.length > 160 || !body.program_id ||
                !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
                throw new HttpError(400, "Provide a valid batch name, program, and start date.");
            }
            const { data, error } = await client
                .from("vsg_training_batches")
                .insert({
                    program_id: body.program_id,
                    name,
                    start_date: startDate,
                    completion_date: typeof body.completion_date === "string"
                        ? body.completion_date || null
                        : null,
                    description: typeof body.description === "string"
                        ? body.description.trim().slice(0, 4000) || null
                        : null,
                    created_by: admin.user.id
                })
                .select()
                .single();
            throwIfError(error);
            await recordAudit(client, admin, "training_batch.created", "training_batch", data.id, {
                name: data.name,
                program_id: data.program_id
            });
            return respond({ success: true, batch: data }, 201);
        }

        if (method === "PATCH" && segments.length === 3 && segments[1] === "batches") {
            const body = await readJson(request);
            const updates: JsonRecord = { updated_at: new Date().toISOString() };
            if (body.name !== undefined) {
                if (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 160) {
                    throw new HttpError(400, "Provide a valid batch name.");
                }
                updates.name = body.name.trim();
            }
            if (body.start_date !== undefined) {
                if (typeof body.start_date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.start_date)) {
                    throw new HttpError(400, "Provide a valid batch start date.");
                }
                updates.start_date = body.start_date;
            }
            if (body.completion_date !== undefined) {
                if (body.completion_date &&
                    (typeof body.completion_date !== "string" ||
                        !/^\d{4}-\d{2}-\d{2}$/.test(body.completion_date))) {
                    throw new HttpError(400, "Provide a valid batch completion date.");
                }
                updates.completion_date = body.completion_date || null;
            }
            if (body.description !== undefined) {
                if (typeof body.description !== "string" || body.description.length > 4000) {
                    throw new HttpError(400, "Batch description is too long.");
                }
                updates.description = body.description.trim() || null;
            }
            if (body.status !== undefined) {
                if (!["Planned", "In Progress", "Completed", "Cancelled"].includes(String(body.status))) {
                    throw new HttpError(400, "Select a valid batch status.");
                }
                updates.status = body.status;
            }
            if (Object.keys(updates).length === 1) {
                throw new HttpError(400, "No batch changes were provided.");
            }
            const { data, error } = await client
                .from("vsg_training_batches")
                .update(updates)
                .eq("id", segments[2])
                .select()
                .single();
            throwIfError(error);
            await recordAudit(client, admin, "training_batch.updated", "training_batch", data.id, {
                fields: Object.keys(updates).filter(key => key !== "updated_at")
            });
            return respond({ success: true, batch: data });
        }

        if (method === "GET" && segments.length === 2 && segments[1] === "enrollments") {
            const batchId = new URL(request.url).searchParams.get("batch_id");
            if (!batchId) {
                throw new HttpError(400, "Select a training batch.");
            }
            const { data, error } = await client
                .from("vsg_training_enrollments")
                .select("*, officer:officers(id, officer_id, name), batch:vsg_training_batches(id, name, program_id)")
                .eq("batch_id", batchId)
                .order("created_at", { ascending: false });
            throwIfError(error);
            return respond({ success: true, enrollments: data || [] });
        }

        if (method === "POST" && segments.length === 2 && segments[1] === "enrollments") {
            const body = await readJson(request);
            const officerIds = Array.isArray(body.officer_ids)
                ? [...new Set(body.officer_ids.filter(id => typeof id === "string"))]
                : [];
            if (!body.batch_id || !officerIds.length || officerIds.length > 100) {
                throw new HttpError(400, "Select a batch and between 1 and 100 officers.");
            }
            const { data, error } = await client
                .from("vsg_training_enrollments")
                .insert(officerIds.map(officerId => ({
                    batch_id: body.batch_id,
                    officer_id: officerId,
                    created_by: admin.user.id
                })))
                .select("id, batch_id, officer_id, enrollment_status");
            throwIfError(error);
            await recordAudit(client, admin, "training_enrollments.created", "training_batch", String(body.batch_id), {
                count: data?.length || 0
            });
            return respond({ success: true, enrollments: data || [] }, 201);
        }

        if (
            method === "PATCH" &&
            segments.length === 3 &&
            segments[1] === "enrollments"
        ) {
            const body = await readJson(request);
            const allowedStatuses = ["Enrolled", "In Progress", "Completed", "Withdrawn"];
            if (!allowedStatuses.includes(String(body.enrollment_status))) {
                throw new HttpError(400, "Select a valid enrollment status.");
            }
            const completionDate = body.enrollment_status === "Completed"
                ? body.completion_date
                : null;
            if (body.enrollment_status === "Completed" &&
                (typeof completionDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(completionDate))) {
                throw new HttpError(400, "A valid completion date is required.");
            }
            const { data, error } = await client
                .from("vsg_training_enrollments")
                .update({
                    enrollment_status: body.enrollment_status,
                    completion_date: completionDate || null,
                    updated_at: new Date().toISOString()
                })
                .eq("id", segments[2])
                .select()
                .single();
            throwIfError(error);
            await recordAudit(client, admin, "training_enrollment.updated", "training_enrollment", data.id, {
                status: data.enrollment_status
            });
            return respond({ success: true, enrollment: data });
        }

        if (method === "GET" && segments.length === 2 && segments[1] === "templates") {
            const { data, error } = await client
                .from("vsg_certificate_templates")
                .select("*, versions:vsg_certificate_template_versions(id, version, configuration, created_at)")
                .order("name");
            throwIfError(error);
            return respond({ success: true, templates: data || [] });
        }

        if (method === "POST" && segments.length === 2 && segments[1] === "templates") {
            const body = await readJson(request);
            const name = typeof body.name === "string" ? body.name.trim() : "";
            const configuration = body.configuration && typeof body.configuration === "object" &&
                !Array.isArray(body.configuration)
                ? body.configuration as JsonRecord
                : {};
            const signatories: unknown[] = Array.isArray(configuration.signatories)
                ? configuration.signatories
                : [];
            if (signatories.some(item => {
                if (!item || typeof item !== "object" || Array.isArray(item)) {
                    return true;
                }
                const signature = item as JsonRecord;
                return signature.enabled === true &&
                    (!signature.name || !signature.title ||
                        typeof signature.signature_path !== "string" ||
                        !/^signatures\/[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(signature.signature_path));
            })) {
                throw new HttpError(400, "Enabled signature slots need an approved signature image, name, and title.");
            }
            if (!name || name.length > 160 || !body.configuration ||
                typeof body.configuration !== "object" || Array.isArray(body.configuration) ||
                JSON.stringify(body.configuration).length > 30000) {
                throw new HttpError(400, "Provide a valid template name and configuration.");
            }
            validateCertificateTemplate(configuration);
            await verifyCertificateAssetPaths(client, configuration);
            const { data, error } = await client.rpc("vsg_create_certificate_template", {
                p_name: name,
                p_configuration: configuration,
                p_actor_user_id: admin.user.id
            });
            throwIfError(error);
            const template = data.template;
            const version = data.version;
            await recordAudit(client, admin, "certificate_template.created", "certificate_template", template.id, {
                name
            });
            return respond({ success: true, template, version }, 201);
        }

        if (
            method === "POST" &&
            segments.length === 3 &&
            segments[1] === "templates"
        ) {
            const body = await readJson(request);
            const configuration = body.configuration && typeof body.configuration === "object" &&
                !Array.isArray(body.configuration)
                ? body.configuration as JsonRecord
                : {};
            const signatories: unknown[] = Array.isArray(configuration.signatories)
                ? configuration.signatories
                : [];
            if (signatories.some(item => {
                if (!item || typeof item !== "object" || Array.isArray(item)) {
                    return true;
                }
                const signature = item as JsonRecord;
                return signature.enabled === true &&
                    (!signature.name || !signature.title ||
                        typeof signature.signature_path !== "string" ||
                        !/^signatures\/[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(signature.signature_path));
            })) {
                throw new HttpError(400, "Enabled signature slots need an approved signature image, name, and title.");
            }
            if (!body.configuration || typeof body.configuration !== "object" ||
                Array.isArray(body.configuration) ||
                JSON.stringify(body.configuration).length > 30000) {
                throw new HttpError(400, "Provide a valid template configuration.");
            }
            validateCertificateTemplate(configuration);
            await verifyCertificateAssetPaths(client, configuration);
            const { data, error } = await client.rpc("vsg_add_certificate_template_version", {
                p_template_id: segments[2],
                p_configuration: configuration,
                p_actor_user_id: admin.user.id
            });
            throwIfError(error);
            const template = data.template;
            const version = data.version;
            await recordAudit(client, admin, "certificate_template.version_created", "certificate_template", template.id, {
                version: version.version
            });
            return respond({ success: true, template, version }, 201);
        }
    }

    if (segments[0] === "certificates") {
        requirePermission(admin, "certificates_manage");

        if (method === "POST" && segments.length === 3 &&
            segments[1] === "assets" && segments[2] === "sign") {
            const body = await readJson(request);
            const path = typeof body.path === "string" ? body.path : "";
            if (!/^((backgrounds|signatures)\/)[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(path)) {
                throw new HttpError(400, "Certificate asset path is invalid.");
            }
            const { data, error } = await client.storage
                .from("vsg-certificate-assets")
                .createSignedUrl(path, 3600);
            if (error) {
                console.error("Unable to create certificate asset preview URL:", error);
                throw new HttpError(404, "Certificate asset could not be found.");
            }
            return respond({ success: true, signed_url: data.signedUrl });
        }

        if (method === "POST" && segments.length === 2 && segments[1] === "assets") {
            let form: FormData;
            try {
                form = await request.formData();
            } catch {
                throw new HttpError(400, "Certificate asset upload is invalid.");
            }
            const file = form.get("file");
            const assetType = form.get("asset_type");
            if (!(file instanceof File) ||
                !["background", "signature"].includes(String(assetType))) {
                throw new HttpError(400, "Choose a certificate background or signature image.");
            }
            if (assetType === "signature" && form.get("management_approved") !== "true") {
                throw new HttpError(400, "Confirm management approval before uploading a signature.");
            }
            const maxSize = assetType === "background" ? 8 * 1024 * 1024 : 2 * 1024 * 1024;
            if (file.size <= 0 || file.size > maxSize ||
                !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
                throw new HttpError(400, "Use a JPEG, PNG, or WebP image within the allowed size.");
            }
            const bytes = new Uint8Array(await file.arrayBuffer());
            const isPng = bytes.length >= 8 &&
                bytes[0] === 0x89 && bytes[1] === 0x50 &&
                bytes[2] === 0x4e && bytes[3] === 0x47 &&
                bytes[4] === 0x0d && bytes[5] === 0x0a &&
                bytes[6] === 0x1a && bytes[7] === 0x0a;
            const isJpeg = bytes.length >= 3 &&
                bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
            const isWebp = bytes.length >= 12 &&
                String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
                String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
            if (
                (file.type === "image/png" && !isPng) ||
                (file.type === "image/jpeg" && !isJpeg) ||
                (file.type === "image/webp" && !isWebp)
            ) {
                throw new HttpError(400, "The uploaded file does not match its image type.");
            }

            const extension = file.type === "image/jpeg" ? "jpg" : file.type.slice("image/".length);
            const directory = assetType === "background" ? "backgrounds" : "signatures";
            const objectPath = `${directory}/${crypto.randomUUID()}.${extension}`;
            const { error: uploadError } = await client.storage
                .from("vsg-certificate-assets")
                .upload(objectPath, file, {
                    contentType: file.type,
                    upsert: false
                });
            if (uploadError) {
                console.error("Unable to upload certificate asset:", uploadError);
                throw new HttpError(500, "Unable to save the certificate asset.");
            }
            const { data: signed, error: signedError } = await client.storage
                .from("vsg-certificate-assets")
                .createSignedUrl(objectPath, 3600);
            if (signedError) {
                console.error("Unable to create certificate asset preview URL:", signedError);
                throw new HttpError(500, "The asset was uploaded but could not be previewed.");
            }
            await recordAudit(client, admin, "certificate_asset.uploaded", "certificate_asset", objectPath, {
                asset_type: assetType,
                approved: assetType === "signature"
            });
            return respond({
                success: true,
                path: objectPath,
                signed_url: signed.signedUrl
            }, 201);
        }

        if (method === "GET" && segments.length === 1) {
            const { data, error } = await client
                .from("vsg_certificates")
                .select("*, officer:officers(id, officer_id, name), program:vsg_training_programs(id, name, certificate_template_id), batch:vsg_training_batches(id, name)")
                .order("created_at", { ascending: false })
                .limit(500);
            throwIfError(error);
            return respond({ success: true, certificates: data || [] });
        }

        if (method === "POST" && segments.length === 2 && segments[1] === "issue") {
            const body = await readJson(request);
            const enrollmentIds = Array.isArray(body.enrollment_ids)
                ? [...new Set(body.enrollment_ids.filter(id => typeof id === "string"))]
                : typeof body.enrollment_id === "string"
                    ? [body.enrollment_id]
                    : [];
            if (!enrollmentIds.length || enrollmentIds.length > 100 ||
                typeof body.template_version_id !== "string") {
                throw new HttpError(400, "Select completed enrollments and a certificate template.");
            }
            const issued = [];
            const failed = [];
            for (const enrollmentId of enrollmentIds) {
                const { data, error } = await client.rpc("vsg_issue_certificate", {
                    p_enrollment_id: enrollmentId,
                    p_template_version_id: body.template_version_id,
                    p_actor_user_id: admin.user.id,
                    p_reissued_from: null
                });
                if (error) {
                    failed.push({ enrollment_id: enrollmentId, message: error.message });
                    continue;
                }
                issued.push(data);
                await recordAudit(client, admin, "certificate.issued", "certificate", data.id, {
                    certificate_id: data.certificate_id
                });
            }
            if (!issued.length) {
                throw new HttpError(400, failed[0]?.message || "No eligible certificates were issued.");
            }
            return respond({
                success: true,
                issued,
                failed,
                message: `${issued.length} certificate${issued.length === 1 ? "" : "s"} issued.`
            }, 201);
        }

        if (method === "POST" && segments.length === 2 && segments[1] === "reissue") {
            const body = await readJson(request);
            if (typeof body.enrollment_id !== "string" ||
                typeof body.template_version_id !== "string" ||
                typeof body.reissued_from !== "string") {
                throw new HttpError(400, "Reissue requires an enrollment, template, and prior certificate.");
            }
            const { data, error } = await client.rpc("vsg_issue_certificate", {
                p_enrollment_id: body.enrollment_id,
                p_template_version_id: body.template_version_id,
                p_actor_user_id: admin.user.id,
                p_reissued_from: body.reissued_from
            });
            throwIfError(error);
            await recordAudit(client, admin, "certificate.reissued", "certificate", data.id, {
                certificate_id: data.certificate_id,
                reissued_from: body.reissued_from
            });
            return respond({ success: true, certificate: data }, 201);
        }

        if (
            method === "POST" &&
            segments.length === 3 &&
            segments[2] === "revoke"
        ) {
            const body = await readJson(request);
            const reason = typeof body.reason === "string" ? body.reason.trim() : "";
            if (!reason || reason.length > 2000) {
                throw new HttpError(400, "A revocation reason is required.");
            }
            const { data: existing, error: existingError } = await client
                .from("vsg_certificates")
                .select("id, certificate_id, status")
                .eq("id", segments[1])
                .maybeSingle();
            throwIfError(existingError);
            if (!existing) {
                throw new HttpError(404, "Certificate not found.");
            }
            if (existing.status !== "Issued") {
                throw new HttpError(409, "Only an issued certificate can be revoked.");
            }
            const { data, error } = await client.rpc("vsg_revoke_certificate", {
                p_certificate_id: existing.id,
                p_reason: reason,
                p_actor_user_id: admin.user.id
            });
            if (error) {
                if (error.message.includes("Only an issued certificate")) {
                    throw new HttpError(409, "Only an issued certificate can be revoked.");
                }
                if (error.message.includes("Certificate not found")) {
                    throw new HttpError(404, "Certificate not found.");
                }
                console.error("Unable to revoke certificate:", error);
                throw new HttpError(500, "Unable to revoke this certificate.");
            }
            await recordAudit(client, admin, "certificate.revoked", "certificate", data.id, {
                certificate_id: data.certificate_id,
                reason
            });
            return respond({ success: true, certificate: data });
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
