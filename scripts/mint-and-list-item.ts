import { network, ethers } from "hardhat";
import { moveBlocks } from "../utils/move-blocks";
import path from "path";
import fs from "fs";

const PRICE = ethers.parseEther("0.005");

async function mintAndList() {
    const chainId = network.config.chainId ?? 31337;

    // Path to deployed addresses
    const deploymentPath = path.join(
        __dirname,
        `../ignition/deployments/chain-${chainId}/deployed_addresses.json`,
    );

    const deploymentJson = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

    const nftMarketPlaceAddress =
        deploymentJson["NFTMarketPlaceModule#NftMarketplace"];

    const nftMarketplace = await ethers.getContractAt(
        "NftMarketplace",
        nftMarketPlaceAddress,
    );

    const randomNumber = Math.floor(Math.random() * 2);

    let basicNft;

    if (randomNumber == 1) {
        const basicNftTwoAddress =
            deploymentJson["BasicNftTwoV2Module#BasicNftTwo"];

        basicNft = await ethers.getContractAt(
            "BasicNftTwo",
            basicNftTwoAddress,
        );
    } else {
        const basicNftAddress = deploymentJson["BasicNftV2Module#BasicNft"];

        basicNft = await ethers.getContractAt("BasicNft", basicNftAddress);
    }

    console.log("Minting NFT...");

    const mintTx = await basicNft.mintNft();

    const mintTxReceipt = await mintTx.wait(1);

    if (!mintTxReceipt) {
        throw new Error("Transaction receipt is null");
    }

    const iface = basicNft.interface;

    const dogMintedEvent = mintTxReceipt.logs
        .map((log) => {
            try {
                return iface.parseLog({
                    topics: log.topics as string[],
                    data: log.data,
                });
            } catch {
                return null;
            }
        })
        .find((parsedLog) => parsedLog?.name === "DogMinted");

    if (!dogMintedEvent) {
        throw new Error("DogMinted event not found");
    }

    const tokenId = dogMintedEvent.args.tokenId;

    console.log("Approving NFT...");

    const approvalTx = await basicNft.approve(
        nftMarketplace.getAddress(),
        tokenId,
    );
    await approvalTx.wait(1);

    console.log("Listing NFT...");

    const tx = await nftMarketplace.listItem(
        await basicNft.getAddress(),
        tokenId,
        PRICE,
        ethers.ZeroAddress,
    );
    await tx.wait(1);

    console.log("NFT Listed!");

    if (network.config.chainId == 31337) {
        // Moralis has a hard time if you move more than 1 at once!
        await moveBlocks(1, 1000);
    }
}

mintAndList()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
