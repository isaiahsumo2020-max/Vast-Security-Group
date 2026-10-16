const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const previews = new WeakMap();

export function validateImageFile(file) {
    if (!file) {
        return null;
    }

    if (!file.type.startsWith("image/")) {
        throw new Error("Choose an image file.");
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
        throw new Error("The image must be 5 MB or smaller.");
    }

    return file;
}

export function previewImageFile(file, imageElement) {
    const validFile = validateImageFile(file);
    const previousUrl = previews.get(imageElement);

    if (previousUrl) {
        URL.revokeObjectURL(previousUrl);
        previews.delete(imageElement);
    }

    if (!validFile) {
        imageElement.removeAttribute("src");
        imageElement.hidden = true;
        return;
    }

    const objectUrl = URL.createObjectURL(validFile);
    previews.set(imageElement, objectUrl);
    imageElement.src = objectUrl;
    imageElement.hidden = false;
}