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



    /* =====================================================
       CREATE APPLICATION FIRST
    ===================================================== */

    const {

        data: application,

        error: applicationError

    } = await supabase

        .from(
            "recruitment_applications"
        )

        .insert({

            full_name:
                fullName,

            phone,

            email:
                email || null,

            gender:
                gender || null,

            address:
                address || null,

            county:
                county || null,


            position_id:
                positionID || null,


            position_name:
                positionName,


            application_letter_type:
                letterMethod,


            application_letter_text:

                letterMethod === "text"

                    ? letterText

                    : null,


            status:
                "Pending"

        })

        .select()

        .single();



    if(applicationError){

        throw applicationError;

    }



    const applicationID =
        application.id;



    /* =====================================================
       UPLOAD PASSPORT PHOTO
    ===================================================== */

    if(passportPhoto){

        const photoExtension =
            passportPhoto.name
                .split(".")
                .pop();


        const photoPath =

            `${applicationID}/passport-photo.${photoExtension}`;


        const uploadedPhoto =

            await uploadFile(

                "recruitment-photos",

                photoPath,

                passportPhoto

            );


        const {

            error: photoUpdateError

        } = await supabase

            .from(
                "recruitment_applications"
            )

            .update({

                photo_url:
                    uploadedPhoto.fileUrl

            })

            .eq(
                "id",
                applicationID
            );


        if(photoUpdateError){

            throw photoUpdateError;

        }

    }



    /* =====================================================
       UPLOAD CV
    ===================================================== */

    if(cv){

        const cvPath =

            `${applicationID}/cv/${Date.now()}-${cv.name}`;


        const uploadedCV =

            await uploadFile(

                "recruitment-documents",

                cvPath,

                cv

            );


        const {

            error: cvDocumentError

        } = await supabase

            .from(
                "recruitment_documents"
            )

            .insert({

                application_id:
                    applicationID,

                document_type:
                    "cv",

                file_name:
                    uploadedCV.fileName,

                file_url:
                    uploadedCV.fileUrl,

                file_size:
                    uploadedCV.fileSize,

                mime_type:
                    uploadedCV.mimeType,

                is_required:
                    true

            });


        if(cvDocumentError){

            throw cvDocumentError;

        }

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

            `${applicationID}/application-letter/${Date.now()}-${applicationLetterFile.name}`;


        const uploadedLetter =

            await uploadFile(

                "recruitment-documents",

                letterPath,

                applicationLetterFile

            );


        const {

            error: letterDocumentError

        } = await supabase

            .from(
                "recruitment_documents"
            )

            .insert({

                application_id:
                    applicationID,

                document_type:
                    "application_letter",

                file_name:
                    uploadedLetter.fileName,

                file_url:
                    uploadedLetter.fileUrl,

                file_size:
                    uploadedLetter.fileSize,

                mime_type:
                    uploadedLetter.mimeType,

                is_required:
                    true

            });


        if(letterDocumentError){

            throw letterDocumentError;

        }

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

                `${applicationID}/supporting/${Date.now()}-${file.name}`;


            const uploadedFile =

                await uploadFile(

                    "recruitment-documents",

                    filePath,

                    file

                );


            const {

                error: documentError

            } = await supabase

                .from(
                    "recruitment_documents"
                )

                .insert({

                    application_id:
                        applicationID,

                    document_type:
                        "other",

                    file_name:
                        uploadedFile.fileName,

                    file_url:
                        uploadedFile.fileUrl,

                    file_size:
                        uploadedFile.fileSize,

                    mime_type:
                        uploadedFile.mimeType,

                    is_required:
                        false

                });


            if(documentError){

                throw documentError;

            }

        }

    }



    return application;

}