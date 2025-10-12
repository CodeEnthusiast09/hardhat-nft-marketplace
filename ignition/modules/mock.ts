import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("MocksModule", (m) => {
    const deployer = m.getAccount(0);

    const ethPriceFeed = m.contract(
        "MockV3Aggregator",
        [8, "400000000000"], // 4000 USD
        { from: deployer, id: "EthPriceFeed" },
    );

    const usdcPriceFeed = m.contract(
        "MockV3Aggregator",
        [8, "100000000"], // 1 USD
        { from: deployer, id: "UsdcPriceFeed" },
    );

    return { ethPriceFeed, usdcPriceFeed };
});
