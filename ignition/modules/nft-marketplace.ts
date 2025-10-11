import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("NFTMarketPlaceModule", (m) => {
    const deployer = m.getAccount(0);

    const priceFeedAddress = m.getParameter("priceFeed");

    const nftMarketPlace = m.contract("NftMarketplace", [priceFeedAddress], {
        from: deployer,
    });

    return { nftMarketPlace };
});
