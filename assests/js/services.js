import { supabase } from "../../backend/config/supabase.js";

const servicesGrid = document.getElementById("servicesGrid");

if (servicesGrid) {
    try {
        const { data, error } = await supabase
            .from("vsg_website_services")
            .select("title, description, icon")
            .eq("is_active", true)
            .order("display_order", { ascending: true });

        if (error) {
            throw error;
        }

        servicesGrid.replaceChildren();

        if (!data?.length) {
            const emptyState = document.createElement("p");
            emptyState.className = "services-empty-state";
            emptyState.textContent = "Our service information is being updated. Please contact us for details.";
            servicesGrid.appendChild(emptyState);
        } else {
            for (const service of data) {
                const card = document.createElement("article");
                card.className = "service-card";

                const icon = document.createElement("i");
                icon.className = `fa-solid ${service.icon || "fa-shield-halved"}`;
                icon.setAttribute("aria-hidden", "true");

                const heading = document.createElement("h3");
                heading.textContent = service.title;

                const description = document.createElement("p");
                description.textContent = service.description;

                card.append(icon, heading, description);
                servicesGrid.appendChild(card);
            }
        }
    } catch (error) {
        console.error(
            "Unable to load managed services; showing the published page content:",
            error
        );
    }
}
