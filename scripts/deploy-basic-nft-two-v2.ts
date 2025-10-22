import hre from "hardhat";
import { developmentChains } from "../helper-hardhat.config";
import verify from "../utils/verify";
import BasicNftTwoV2Module from "../ignition/modules/basic-nft-two-v2";

async function main() {
    console.log("----------------------------------------------------");
    console.log(`Deploying to network: ${hre.network.name}`);
    console.log("----------------------------------------------------");

    console.log("* Deploying BasicNftTwo...");

    const basicNftTwoV2Deployed =
        await hre.ignition.deploy(BasicNftTwoV2Module);

    const basicNftTwoV2 = basicNftTwoV2Deployed.basicNftTwo;

    const basicNftTwoV2Address = await basicNftTwoV2.getAddress();

    console.log("\n" + "=".repeat(50));
    console.log("🎉 DEPLOYMENT COMPLETE");
    console.log("=".repeat(50));

    console.log(`
    ✅ BasicNftTwo Deployment Summary
    ----------------------------------
    Contract: ${basicNftTwoV2Address}
    `);

    if (
        !developmentChains.includes(hre.network.name) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        await verify(basicNftTwoV2Address, []);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
