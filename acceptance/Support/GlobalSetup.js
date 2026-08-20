/**
 * Puts the database into the one state tests cannot reach through the system:
 * the schema itself, freshly built.
 *
 * Set ACCEPTANCE_SKIP_RESET=1 while writing tests, when the schema has not
 * moved and the reset is not worth paying for on every run.
 */

import { resetDatabase } from "./Stack.js";
import { SUPABASE_URL } from "./Database.js";

export default function globalSetup() {
    if (process.env.ACCEPTANCE_SKIP_RESET === "1") {
        console.log("Acceptance: skipping database reset (ACCEPTANCE_SKIP_RESET=1)");
        return;
    }

    console.log(`Acceptance: resetting ${SUPABASE_URL} from migrations...`);
    resetDatabase();
}
