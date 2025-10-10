import { ethers } from "hardhat";

export interface networkConfigItem {
    name?: string;
    ethUsdPriceFeed?: string;
    supportedTokens?: Array<{
        symbol: string;
        address: string;
        priceFeed: string;
        decimals: number;
    }>;
}

export interface networkConfigInfo {
    [key: number]: networkConfigItem;
}

export const networkConfig: networkConfigInfo = {
    31337: {
        name: "localhost",
        ethUsdPriceFeed: "0x9326BFA02ADD2366b30bacB125260Af641031331",
        supportedTokens: [
            {
                symbol: "USDC",
                address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // Sepolia USDC address
                priceFeed: "0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E", // USDC/USD feed
                decimals: 6,
            },
            {
                symbol: "DAI",
                address: "0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357",
                priceFeed: "0x14866185B1962B63C3Ea9E03Bc1da838bab34C19",
                decimals: 18,
            },
        ],
    },
    11155111: {
        name: "sepolia",
        ethUsdPriceFeed: "0x694AA1769357215DE4FAC081bf1f309aDC325306",
        supportedTokens: [
            {
                symbol: "USDC",
                address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // Sepolia USDC address
                priceFeed: "0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E", // USDC/USD feed
                decimals: 6,
            },
            {
                symbol: "DAI",
                address: "0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357",
                priceFeed: "0x14866185B1962B63C3Ea9E03Bc1da838bab34C19",
                decimals: 18,
            },
        ],
    },
    1: {
        name: "mainnet",
    },
};

export const developmentChains = ["hardhat", "localhost"];
export const VERIFICATION_BLOCK_CONFIRMATIONS = 6;
export const frontEndContractsFile =
    "../nft-marketplace/src/lib/contract-address.json";
export const frontEndAbiFile = "../nft-marketplace/src/lib/abi.json";
export const frontEndUtils = "../nft-marketplace/src/lib/contracts.ts";
