import hre from "hardhat";
import { developmentChains } from "../helper-hardhat.config";
import verify from "../utils/verify";
import BasicNftModule from "../ignition/modules/basic-nft";

async function main() {
    console.log("----------------------------------------------------");
    console.log(`Deploying to network: ${hre.network.name}`);
    console.log("----------------------------------------------------");

    console.log("* Deploying BasicNft...");

    const basicNftDeployed = await hre.ignition.deploy(BasicNftModule);

    const basicNft = basicNftDeployed.basicNft;

    const basicNftAddress = await basicNft.getAddress();

    console.log("\n" + "=".repeat(50));
    console.log("🎉 DEPLOYMENT COMPLETE");
    console.log("=".repeat(50));

    console.log(`
    ✅ BasicNft Deployment Summary
    ----------------------------------
    Contract: ${basicNftAddress}
    `);

    if (
        !developmentChains.includes(hre.network.name) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        await verify(basicNftAddress, []);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
