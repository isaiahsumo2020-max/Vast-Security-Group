export const LIBERIA_COUNTIES = [
    "Bomi",
    "Bong",
    "Gbarpolu",
    "Grand Bassa",
    "Grand Cape Mount",
    "Grand Gedeh",
    "Grand Kru",
    "Lofa",
    "Margibi",
    "Maryland",
    "Montserrado",
    "Nimba",
    "River Cess",
    "River Gee",
    "Sinoe"
];

export function populateLiberiaCountySelect(select) {
    if (!(select instanceof HTMLSelectElement)) {
        throw new TypeError("A county select element is required.");
    }

    const currentValue = select.value;
    select.replaceChildren(new Option("Select county", ""));

    for (const county of LIBERIA_COUNTIES) {
        select.add(new Option(county, county));
    }

    if (currentValue && !LIBERIA_COUNTIES.includes(currentValue)) {
        select.add(new Option(`${currentValue} (existing value)`, currentValue));
    }

    select.value = currentValue;
}

export function setLiberiaCountySelectValue(select, value) {
    const county = value || "";
    if (
        county &&
        !LIBERIA_COUNTIES.includes(county) &&
        !Array.from(select.options).some(option => option.value === county)
    ) {
        select.add(new Option(`${county} (existing value)`, county));
    }

    select.value = county;
}
