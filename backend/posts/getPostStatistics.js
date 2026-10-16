import { supabase } from "../config/supabase.js";

export async function getPostStatistics() {
    const { data: posts, error: postsError } = await supabase
        .from("security_posts")
        .select("id, required_officers, status");

    if (postsError) {
        console.error("Error loading post statistics:", postsError);
        throw postsError;
    }

    const { data: assignments, error: assignmentsError } = await supabase
        .from("security_post_assignments")
        .select("id, post_id, officer_id, assignment_status");

    if (assignmentsError) {
        console.error("Error loading deployment statistics:", assignmentsError);
        throw assignmentsError;
    }

    const allPosts = posts || [];
    const allAssignments = assignments || [];

    const totalPosts = allPosts.length;

    const activePosts = allPosts.filter(
        post => post.status === "Active"
    );

    const activePostIds = new Set(
        activePosts.map(post => post.id)
    );

    const activeAssignments = allAssignments.filter(
        assignment =>
            assignment.assignment_status === "Active" &&
            activePostIds.has(assignment.post_id)
    );

    const requiredOfficers = activePosts.reduce(
        (total, post) =>
            total + Number(post.required_officers || 0),
        0
    );

    const deployedOfficers = activeAssignments.length;

    const vacantPositions = Math.max(
        requiredOfficers - deployedOfficers,
        0
    );

    const deploymentCoverage =
        requiredOfficers > 0
            ? Math.round(
                (deployedOfficers / requiredOfficers) * 100
            )
            : 0;

    return {
        totalPosts,
        activePosts: activePosts.length,
        requiredOfficers,
        deployedOfficers,
        vacantPositions,
        deploymentCoverage
    };
}