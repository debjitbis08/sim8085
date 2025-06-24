import { writeFileSync } from "fs";

const pubId = process.env.PUBLIC_ADSENSE_PUB_ID;

if (!pubId) {
    console.log("❌ PUBLIC_ADSENSE_PUB_ID is not set. Not generating ads.txt.");
    process.exit(0);
}

const content = `google.com, ${pubId}, DIRECT, f08c47fec0942fa0`;
writeFileSync("public/ads.txt", content);
console.log("✅ ads.txt generated in public/");
