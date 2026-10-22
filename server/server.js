import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();

const PORT = process.env.PORT || 5000;
const projectRoot = path.resolve(
    fileURLToPath(new URL("..", import.meta.url))
);

app.use("/admin/shortist", (req, res) => {
    res.redirect(301, `/admin/shortlist${req.path}`);
});

app.use("/assests", express.static(path.join(projectRoot, "assests")));
app.use("/admin", express.static(path.join(projectRoot, "admin")));
app.use("/backend", express.static(path.join(projectRoot, "backend")));
app.use("/recruitment", express.static(path.join(projectRoot, "recruitment")));

const publicPages = [
    "about.html",
    "certificate-verification.html",
    "contact.html",
    "gallery.html",
    "index.html",
    "legal.html",
    "privacy.html",
    "recruitment.html",
    "services.html",
    "verification.html"
];

app.get("/", (req, res) => {
    res.sendFile(path.join(projectRoot, "index.html"));
});

for (const page of publicPages) {
    app.get(`/${page}`, (req, res) => {
        res.sendFile(path.join(projectRoot, page));
    });
}

app.listen(PORT, () => {
    console.log(`VAST static website running on port ${PORT}`);
});