import hre from "hardhat";
import { developmentChains } from "../helper-hardhat.config";
import verify from "../utils/verify";
import MockErc20Module from "../ignition/modules/mock-erc20";

async function main() {
    console.log("----------------------------------------------------");
    console.log(`Deploying to network: ${hre.network.name}`);
    console.log("----------------------------------------------------");

    console.log("* Deploying mockErc20...");

    const mockErc20Deployed = await hre.ignition.deploy(MockErc20Module, {
        parameters: {
            MockErc20Module: {
                name: "USD Coin",
                symbol: "USDC",
                decimals: 6,
            },
        },
    });

    const mockErc20 = mockErc20Deployed.mockErc20;

    const mockErc20Address = await mockErc20.getAddress();

    console.log("\n" + "=".repeat(50));
    console.log("🎉 DEPLOYMENT COMPLETE");
    console.log("=".repeat(50));

    console.log(`
    ✅ MockErc20 Deployment Summary
    ----------------------------------
    Contract: ${mockErc20Address}
    `);

    // if (
    //     !developmentChains.includes(hre.network.name) &&
    //     process.env.ETHERSCAN_API_KEY
    // ) {
    //     await verify(mockErc20Address, ["USD Coin", "USDC", 6]);
    // }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
