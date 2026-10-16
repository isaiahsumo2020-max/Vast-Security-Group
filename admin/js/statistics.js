export function getOfficerStatistics(officers) {
    return {
        total: officers.length,
        active: officers.filter(
            officer => officer.status === "Verified Active"
        ).length
    };
}

export function renderOfficerStatistics(officers) {
    const statistics = getOfficerStatistics(officers);
    const totalElement = document.getElementById("totalOfficers");
    const activeElement = document.getElementById("activeOfficers");

    if (totalElement) {
        totalElement.textContent = String(statistics.total);
    }

    if (activeElement) {
        activeElement.textContent = String(statistics.active);
    }
}