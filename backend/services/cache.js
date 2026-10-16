//==================================
// CACHE SERVICE
//==================================

export function saveOfficers(officers){

    localStorage.setItem(

        "vast_officers",

        JSON.stringify(officers)

    );

}

export function getCachedOfficers(){

    return JSON.parse(

        localStorage.getItem("vast_officers")

    ) || [];

}