import {
    supabase
} from "../config/supabase.js";


/* =========================================================
   UPLOAD FILE
========================================================= */

async function uploadFile(
    bucket,
    path,
    file
){

    const {
        error
    } = await supabase
        .storage
        .from(bucket)
        .upload(
            path,
            file,
            {
                upsert: false
            }
        );


    if(error){

        throw error;

    }


    const {
        data
    } = supabase
        .storage
        .from(bucket)
        .getPublicUrl(path);


    return {

        fileName:
            file.name,

        fileUrl:
            data.publicUrl,

        fileSize:
            file.size,

        mimeType:
            file.type

    };

}

function generateTrackingCode() {
    const randomValues = new Uint32Array(1);
    const range = 0x100000000;
    const limit = Math.floor(range / 1000000) * 1000000;
    let value;

    do {
        crypto.getRandomValues(randomValues);
        value = randomValues[0];
    } while (value >= limit);

    return String(value % 1000000).padStart(6, "0");
}

async function registerDocument(
    applicationID,
    trackingCode,
    document
) {
    const { error } = await supabase.rpc(
        "register_recruitment_document",
        {
            application_id_input: applicationID,
            tracking_code_input: trackingCode,
            document_type_input: document.documentType,
            file_name_input: document.fileName,
            file_url_input: document.fileUrl,
            file_size_input: document.fileSize,
            mime_type_input: document.mimeType,
            is_required_input: document.isRequired
        }
    );

    if (error) {
        throw error;
    }
}

async function saveApplicationPhoto(applicationID, trackingCode, photoUrl) {
    const { error } = await supabase.rpc(
        "set_recruitment_application_photo",
        {
            application_id_input: applicationID,
            tracking_code_input: trackingCode,
            photo_url_input: photoUrl
        }
    );

    if (error) {
        throw error;
    }
}


/* =========================================================
   SUBMIT APPLICATION
========================================================= */

export async function submitApplication(
    applicationData
){

    const {

        fullName,
        phone,
        email,
        gender,
        address,
        county,

        positionID,
        positionName,

        letterMethod,
        letterText,

        passportPhoto,
        cv,

        applicationLetterFile,

        supportingDocuments

    } = applicationData;

    let applicationID;
    let trackingCode;



    /* =====================================================
       CREATE APPLICATION FIRST
    ===================================================== */

    for (let attempt = 0; attempt < 5; attempt += 1) {
        applicationID = crypto.randomUUID();
        trackingCode = generateTrackingCode();

        const { error: applicationError } = await supabase
            .from("recruitment_applications")
            .insert({
                id: applicationID,
                tracking_code: trackingCode,
                full_name: fullName,
                phone,
                email: email || null,
                gender: gender || null,
                address: address || null,
                county: county || null,
                position_id: positionID || null,
                position_name: positionName,
                application_letter_type: letterMethod,
                application_letter_text:
                    letterMethod === "text" ? letterText : null,
                status: "Pending"
            });

        if (!applicationError) {
            break;
        }

        if (applicationError.code !== "23505" || attempt === 4) {
            throw applicationError;
        }
    }



    /* =====================================================
       UPLOAD PASSPORT PHOTO
    ===================================================== */

    if(passportPhoto){

        const photoExtension =
            passportPhoto.name
                .split(".")
                .pop();


        const photoPath =

            `${applicationID}/${trackingCode}/passport-photo.${photoExtension}`;


        const uploadedPhoto =

            await uploadFile(

                "recruitment-photos",

                photoPath,

                passportPhoto

            );


        await saveApplicationPhoto(
            applicationID,
            trackingCode,
            uploadedPhoto.fileUrl
        );

    }



    /* =====================================================
       UPLOAD CV
    ===================================================== */

    if(cv){

        const cvPath =

            `${applicationID}/${trackingCode}/cv/${Date.now()}-${cv.name}`;


        const uploadedCV =

            await uploadFile(

                "recruitment-documents",

                cvPath,

                cv

            );


        await registerDocument(applicationID, trackingCode, {
            documentType: "cv",
            ...uploadedCV,
            isRequired: true
        });

    }



    /* =====================================================
       UPLOAD APPLICATION LETTER
       ONLY IF UPLOAD OPTION WAS CHOSEN
    ===================================================== */

    if(

        letterMethod === "upload"

        &&

        applicationLetterFile

    ){

        const letterPath =

            `${applicationID}/${trackingCode}/application-letter/${Date.now()}-${applicationLetterFile.name}`;


        const uploadedLetter =

            await uploadFile(

                "recruitment-documents",

                letterPath,

                applicationLetterFile

            );


        await registerDocument(applicationID, trackingCode, {
            documentType: "application_letter",
            ...uploadedLetter,
            isRequired: true
        });

    }



    /* =====================================================
       UPLOAD SUPPORTING DOCUMENTS
    ===================================================== */

    if(

        supportingDocuments

        &&

        supportingDocuments.length > 0

    ){

        for(

            const file

            of supportingDocuments

        ){

            const filePath =

                `${applicationID}/${trackingCode}/supporting/${Date.now()}-${file.name}`;


            const uploadedFile =

                await uploadFile(

                    "recruitment-documents",

                    filePath,

                    file

                );


            await registerDocument(applicationID, trackingCode, {
                documentType: "other",
                ...uploadedFile,
                isRequired: false
            });

        }

    }



    return { id: applicationID, trackingCode };

}