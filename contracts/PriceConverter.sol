// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

library PriceConverter {
    function convertPrice(
        uint256 amount,
        AggregatorV3Interface fromFeed,
        uint8 fromDecimals,
        AggregatorV3Interface toFeed,
        uint8 toDecimals
    ) internal view returns (uint256) {
        if (address(fromFeed) == address(toFeed)) return amount;

        uint256 fromPriceUsd = getTokenPriceInUsd(fromFeed);
        uint256 toPriceUsd = getTokenPriceInUsd(toFeed);

        uint256 amountInUsd = (amount * fromPriceUsd) / (10 ** fromDecimals);
        uint256 convertedAmount = (amountInUsd * (10 ** toDecimals)) / toPriceUsd;

        return convertedAmount;
    }

    function getTokenPriceInUsd(AggregatorV3Interface priceFeed) internal view returns (uint256) {
        (, int256 price, , , ) = priceFeed.latestRoundData();
        require(price > 0, "Invalid price from feed");
        return uint256(price);
    }
}
