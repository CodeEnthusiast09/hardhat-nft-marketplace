import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const MockErc20Module = buildModule("MockErc20Module", (m) => {
    const deployer = m.getAccount(0);

    const name = m.getParameter("name", "USD Coin");

    const symbol = m.getParameter("symbol", "USDC");

    const decimals = m.getParameter("decimals", 6);

    const mockErc20 = m.contract("MockERC20", [name, symbol, decimals], {
        from: deployer,
    });

    return { mockErc20 };
});

export default MockErc20Module;
