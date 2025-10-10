import hre from "hardhat";
import MockModule from "../ignition/modules/Mock";
import NFTMarketPlaceModule from "../ignition/modules/nft-market-place";
import {
    developmentChains,
    networkConfig,
    VERIFICATION_BLOCK_CONFIRMATIONS,
} from "../helper-hardhat.config";
import verify from "../utils/verify";

async function main() {
    let priceFeedAddress: string;

    console.log("----------------------------------------------------");
    console.log(`Deploying to network: ${hre.network.name}`);
    console.log("----------------------------------------------------");

    if (developmentChains.includes(hre.network.name)) {
        console.log("* Local network detected, deploying mocks...");
        const mockResult = await hre.ignition.deploy(MockModule);
        const mock = mockResult.mockV3Aggregator;
        priceFeedAddress = await mock.getAddress();
    } else {
        const chainId = hre.network.config.chainId!;

        const feed = networkConfig[chainId]?.ethUsdPriceFeed;

        if (!feed) throw new Error(`Missing feed for ${hre.network.name}`);
        priceFeedAddress = feed;
    }

    console.log("* Deploying NFTMarketPlace...");

    const NFTMarketPlaceDeployment = await hre.ignition.deploy(
        NFTMarketPlaceModule,
        {
            parameters: {
                NFTMarketPlaceModule: {
                    priceFeed: priceFeedAddress,
                },
            },
        },
    );

    const nftMarketPlace = NFTMarketPlaceDeployment.nftMarketPlace;

    const nftMarketPlaceAddress = await nftMarketPlace.getAddress();

    console.log("\n" + "=".repeat(50));
    console.log("🎉 DEPLOYMENT COMPLETE");
    console.log("=".repeat(50));

    console.log(`
    ✅ NFTMarketplace Deployment Summary
    ----------------------------------
    Network: ${hre.network.name}
    Feed: ${priceFeedAddress}
    Contract: ${nftMarketPlaceAddress}
    `);

    // Wait for block confirmations here
    const deploymentTx = nftMarketPlace.deploymentTransaction();

    const deploymentReceipt = await deploymentTx?.wait(1);

    if (!deploymentReceipt) {
        console.log(
            "* No new deployment transaction (contract may already be deployed).",
        );
    } else {
        const txReceipt = await hre.ethers.provider.waitForTransaction(
            deploymentReceipt.hash,
            VERIFICATION_BLOCK_CONFIRMATIONS,
        );

        if (!txReceipt) {
            throw new Error("Failed to fetch transaction receipt");
        }

        console.log(
            `* Deployment confirmed in ${txReceipt.confirmations} blocks`,
        );
    }

    if (!developmentChains.includes(hre.network.name)) {
        console.log("\n🪙 Configuring supported tokens...");

        const chainId = hre.network.config.chainId!;

        const tokens = networkConfig[chainId]?.supportedTokens;

        if (tokens && tokens.length > 0) {
            for (const token of tokens) {
                try {
                    console.log(`* Adding ${token.symbol}...`);

                    const tx = await nftMarketPlace.addSupportedToken(
                        token.address,
                        token.priceFeed,
                        token.decimals,
                    );

                    await tx.wait(1);

                    console.log(`* ${token.symbol} added successfully`);
                } catch (error) {
                    console.error(`* Failed to add ${token.symbol}:`, error);
                }
            }
        } else {
            console.log("* No additional tokens configured for this network");
        }
    }

    if (
        !developmentChains.includes(hre.network.name) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        await verify(nftMarketPlaceAddress, [priceFeedAddress]);
    }

    console.log("----------------------------------------------------");
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
