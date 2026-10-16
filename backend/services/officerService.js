//======================================
// OFFICER SERVICE
//======================================

import { getOfficers } from "../officers/getOfficers.js";

import {
    saveOfficers,
    getCachedOfficers
} from "./cache.js";

class OfficerService {

    constructor(){

        this.officers = [];

    }

    async initialize(){

        try{

            const officers = await getOfficers();

            if(officers.length){

                console.log("✔ Loaded officers from Supabase");

                this.officers = officers;

                saveOfficers(officers);

                return;

            }

            throw new Error();

        }

        catch(error){

            console.warn("⚠ Using Offline Cache");

            this.officers = getCachedOfficers();

        }

    }

    findByOfficerID(id){

        return this.officers.find(officer =>

            officer.officer_id.toLowerCase() === id.toLowerCase()

        );

    }

    findByName(name){

        return this.officers.find(officer =>

            `${officer.name}`

            .toLowerCase()

            .includes(name.toLowerCase())

        );

    }

    getAll(){

        return this.officers;

    }

}

export const officerService = new OfficerService();