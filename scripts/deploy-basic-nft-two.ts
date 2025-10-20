import hre from "hardhat";
import { developmentChains } from "../helper-hardhat.config";
import verify from "../utils/verify";
import BasicNftTwoModule from "../ignition/modules/basic-nft-two";

async function main() {
    console.log("----------------------------------------------------");
    console.log(`Deploying to network: ${hre.network.name}`);
    console.log("----------------------------------------------------");

    console.log("* Deploying BasicNftTwo...");

    const basicNftTwoDeployed = await hre.ignition.deploy(BasicNftTwoModule);

    const basicNftTwo = basicNftTwoDeployed.basicNftTwo;

    const basicNftTwoAddress = await basicNftTwo.getAddress();

    console.log("\n" + "=".repeat(50));
    console.log("🎉 DEPLOYMENT COMPLETE");
    console.log("=".repeat(50));

    console.log(`
    ✅ BasicNftTwo Deployment Summary
    ----------------------------------
    Contract: ${basicNftTwoAddress}
    `);

    if (
        !developmentChains.includes(hre.network.name) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        await verify(basicNftTwoAddress, []);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
