# NFT Marketplace

A decentralized NFT marketplace built with Next.js, Solidity, The Graph, and Web3 technologies. Buy, sell, and trade NFTs with support for multiple payment tokens (ETH and USDC).

![NFT Marketplace](https://img.shields.io/badge/Next.js-14-black)
![Solidity](https://img.shields.io/badge/Solidity-^0.8.0-blue)
![The Graph](https://img.shields.io/badge/The%20Graph-Indexing-purple)

## 🌟 Features

- **List NFTs for Sale** - Set your price in ETH or USDC
- **Buy NFTs** - Purchase listed NFTs with supported tokens
- **Update Listings** - Modify price and payment token anytime
- **Cancel Listings** - Remove your NFT from the marketplace
- **Withdraw Proceeds** - Claim your earnings from sales

## 🛠️ Tech Stack

- **Solidity** - Smart contract development
- **Hardhat** - Ethereum development environment
- **The Graph** - Decentralized indexing protocol
- **GraphQL** - Query language for NFT data
- **Chainlink Price Feeds** - Real-time token price conversion
- **IPFS** - Decentralized storage for NFT metadata

### Testing & Development

- **Sepolia Testnet** - Ethereum test network
- **Graph Studio** - Subgraph deployment and management

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/CodeEnthusiast09/hardhat-nft-marketplace.git
cd hardhat-nft-marketplace
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables

Create a `.env` file in the root directory and add your API keys inside.

```env
PRIVATE_KEY=your-wallet-private-key (aviod wallet will real funds)
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_API
COINMARKETCAP_API_KEY=YOUR_COINMARKETCAP_API_KEY 
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY 
UPDATE_FRONT_END=true
```
