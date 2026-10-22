export const ADMIN_ROLES = [
    "Super Admin",
    "HR Admin",
    "Recruitment Admin",
    "Operations Admin",
    "Security/Post Admin",
    "Finance Admin",
    "Custom Admin"
];

export const DEFAULT_PERMISSIONS = {
    "Super Admin": {
        all: true
    },

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