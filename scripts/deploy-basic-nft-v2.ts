import hre from "hardhat";
import { developmentChains } from "../helper-hardhat.config";
import verify from "../utils/verify";
import BasicNftV2Module from "../ignition/modules/basic-nft-v2";

async function main() {
    console.log("----------------------------------------------------");
    console.log(`Deploying to network: ${hre.network.name}`);
    console.log("----------------------------------------------------");

    console.log("* Deploying BasicNft...");

    const basicNftV2Deployed = await hre.ignition.deploy(BasicNftV2Module);

    const basicNftV2 = basicNftV2Deployed.basicNft;

    const basicNftV2Address = await basicNftV2.getAddress();

    console.log("\n" + "=".repeat(50));
    console.log("🎉 DEPLOYMENT COMPLETE");
    console.log("=".repeat(50));

    console.log(`
    ✅ BasicNft Deployment Summary
    ----------------------------------
    Contract: ${basicNftV2Address}
    `);

    if (
        !developmentChains.includes(hre.network.name) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        await verify(basicNftV2Address, []);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
