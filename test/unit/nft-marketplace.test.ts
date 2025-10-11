import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { assert, expect } from "chai";
import { network, ethers } from "hardhat";
import hre from "hardhat";
import { developmentChains } from "../../helper-hardhat.config";
import { NftMarketplace, BasicNft } from "../../typechain-types";
import NftMarketPlaceModule from "../../ignition/modules/nft-marketplace";
import BasicNftModule from "../../ignition/modules/basic-nft";

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Nft Marketplace Unit Tests", function () {
          let nftMarketplace: NftMarketplace,
              nftMarketplaceContract: NftMarketplace,
              basicNft: BasicNft;

          const PRICE = ethers.parseEther("0.1");

          const TOKEN_ID = 0;

          let deployer: SignerWithAddress;

          let user: SignerWithAddress;

          beforeEach(async () => {
              const accounts = await ethers.getSigners();

              deployer = accounts[0];

              user = accounts[1];

              const basicNftDeployed =
                  await hre.ignition.deploy(BasicNftModule);

              const basicNFT = basicNftDeployed.basicNft;

              const basicNftAddress = await basicNFT.getAddress();

              basicNft = (await ethers.getContractAt(
                  "BasicNft",
                  basicNftAddress,
              )) as BasicNft;

              const nftMarketplaceDeployed =
                  await hre.ignition.deploy(NftMarketPlaceModule);

              const nftMarketPlace = nftMarketplaceDeployed.nftMarketPlace;

              const nftMarketPlaceAddress = await nftMarketPlace.getAddress();

              nftMarketplaceContract = (await ethers.getContractAt(
                  "NftMarketplace",
                  nftMarketPlaceAddress,
              )) as NftMarketplace;

              nftMarketplace = nftMarketplaceContract.connect(deployer);

              await basicNft.connect(deployer).mintNft();

              await basicNft
                  .connect(deployer)
                  .approve(nftMarketPlaceAddress, TOKEN_ID);
          });

          // ============================================================================
          // SETUP & CONSTRUCTOR
          // ============================================================================

          describe("Constructor", () => {
              it("initializes with contract owner");
              // ASSERT: owner == deployer

              it("sets up native ETH token support by default");
              // ASSERT: isTokenSupported(NATIVE_TOKEN) == true

              it("correctly configures ETH price feed");
              // ASSERT: getTokenInfo(NATIVE_TOKEN).priceFeed == ethPriceFeed
              // ASSERT: getTokenInfo(NATIVE_TOKEN).decimals == 18
          });

          // ============================================================================
          // TOKEN MANAGEMENT
          // ============================================================================

          describe("Token Management", () => {
              describe("addSupportedToken", () => {
                  it("allows owner to add new supported tokens");
                  // ACT: owner.addSupportedToken(USDC, usdcPriceFeed, 6)
                  // ASSERT: isTokenSupported(USDC) == true
                  // ASSERT: getTokenInfo(USDC).decimals == 6

                  it("reverts when non-owner tries to add tokens");
                  // ACT: nonOwner.addSupportedToken(USDC, usdcPriceFeed, 6)
                  // ASSERT: reverts with "Not contract owner"

                  it("emits TokenAdded event");
                  // ACT: owner.addSupportedToken(USDC, usdcPriceFeed, 6)
                  // ASSERT: event emitted with (USDC, usdcPriceFeed, 6)
              });

              describe("removeSupportedToken", () => {
                  it("allows owner to remove supported tokens");
                  // ARRANGE: add USDC token
                  // ACT: owner.removeSupportedToken(USDC)
                  // ASSERT: isTokenSupported(USDC) == false

                  it("reverts when non-owner tries to remove tokens");
                  // ACT: nonOwner.removeSupportedToken(USDC)
                  // ASSERT: reverts with "Not contract owner"

                  it("prevents NEW listings with removed token");
                  // ARRANGE: add USDC, list NFT, remove USDC
                  // ACT: listItem(nft2, tokenId2, 1000, USDC)
                  // ASSERT: reverts with TokenNotSupported

                  it("prevents buying with removed token");
                  // ARRANGE: add USDC, list NFT in ETH, remove USDC
                  // ACT: buyItem(nftAddress, tokenId, USDC)
                  // ASSERT: reverts with TokenNotSupported
              });
          });

          // ============================================================================
          // LISTING
          // ============================================================================

          describe("listItem", () => {
              it("lists NFT with correct price and payment token");
              // ARRANGE: mint NFT, approve marketplace
              // ACT: listItem(nftAddress, tokenId, 1000e6, USDC)
              // ASSERT: listing.price == 1000e6
              // ASSERT: listing.seller == owner
              // ASSERT: listing.paymentToken == USDC

              it("reverts if price is zero");
              // ACT: listItem(nftAddress, tokenId, 0, ETH)
              // ASSERT: reverts with PriceMustBeAboveZero

              it("reverts if not approved");
              // ARRANGE: mint NFT, DO NOT approve
              // ACT: listItem(nftAddress, tokenId, 1 ether, ETH)
              // ASSERT: reverts with NotApprovedForMarketplace

              it("reverts if not owner");
              // ARRANGE: mint NFT to user1
              // ACT: user2.listItem(nftAddress, tokenId, 1 ether, ETH)
              // ASSERT: reverts with NotOwner

              it("reverts if already listed");
              // ARRANGE: list NFT once
              // ACT: list same NFT again
              // ASSERT: reverts with AlreadyListed

              it("reverts when trying to list with unsupported token");
              // ACT: listItem(nftAddress, tokenId, 1000, RANDOM_TOKEN)
              // ASSERT: reverts with TokenNotSupported

              it("emits ItemListed event");
              // ACT: listItem(nftAddress, tokenId, 1 ether, ETH)
              // ASSERT: event emitted with (seller, nftAddress, tokenId, 1 ether, ETH)
          });

          // ============================================================================
          // BUYING - SAME TOKEN
          // ============================================================================

          describe("buyItem - Same Token Payment", () => {
              it("allows buying with ETH when listed in ETH");
              // ARRANGE: list NFT for 1 ETH
              // ACT: buyer.buyItem{value: 1 ether}(nftAddress, tokenId, ETH)
              // ASSERT: NFT owner == buyer
              // ASSERT: seller proceeds[ETH] == 1 ether
              // ASSERT: listing deleted

              it("allows buying with ERC20 when listed in same ERC20");
              // ARRANGE: list NFT for 1000 USDC, buyer has USDC, buyer approves marketplace
              // ACT: buyer.buyItem(nftAddress, tokenId, USDC)
              // ASSERT: NFT owner == buyer
              // ASSERT: seller proceeds[USDC] == 1000e6
              // ASSERT: buyer USDC balance decreased by 1000e6

              it("reverts if ETH amount sent is insufficient");
              // ARRANGE: list NFT for 1 ETH
              // ACT: buyer.buyItem{value: 0.5 ether}(nftAddress, tokenId, ETH)
              // ASSERT: reverts with PriceNotMet

              it("refunds excess ETH to buyer");
              // ARRANGE: list NFT for 0.3 ETH
              // ACT: buyer.buyItem{value: 1 ether}(nftAddress, tokenId, ETH)
              // ASSERT: seller proceeds[ETH] == 0.3 ether
              // ASSERT: buyer received refund of 0.7 ether

              it("reverts if ERC20 allowance is insufficient");
              // ARRANGE: list for 1000 USDC, buyer has USDC, buyer approves only 500 USDC
              // ACT: buyer.buyItem(nftAddress, tokenId, USDC)
              // ASSERT: reverts (transfer fails)

              it("reverts if ERC20 balance is insufficient");
              // ARRANGE: list for 1000 USDC, buyer has only 500 USDC
              // ACT: buyer.buyItem(nftAddress, tokenId, USDC)
              // ASSERT: reverts (transfer fails)
          });

          // ============================================================================
          // BUYING - CROSS TOKEN (CHAINLINK CONVERSION)
          // ============================================================================

          describe("buyItem - Cross Token Payment", () => {
              it("allows buying with ETH when listed in USDC");
              // ARRANGE:
              //   - list NFT for 1000 USDC
              //   - mock price feeds: ETH/USD = $2800, USDC/USD = $1
              //   - expected ETH needed = 1000 / 2800 = ~0.357 ETH
              // ACT: buyer.buyItem{value: 0.357 ether}(nftAddress, tokenId, ETH)
              // ASSERT: NFT owner == buyer
              // ASSERT: seller proceeds[ETH] == 0.357 ether (NOT USDC!)
              // ASSERT: listing deleted

              it("allows buying with USDC when listed in ETH");
              // ARRANGE:
              //   - list NFT for 1 ETH
              //   - mock price feeds: ETH/USD = $2800, USDC/USD = $1
              //   - expected USDC needed = 1 * 2800 = 2800 USDC
              // ACT: buyer.buyItem(nftAddress, tokenId, USDC)
              // ASSERT: NFT owner == buyer
              // ASSERT: seller proceeds[USDC] == 2800e6 (NOT ETH!)
              // ASSERT: buyer USDC decreased by 2800e6

              it("converts between different ERC20 tokens (USDC to DAI)");
              // ARRANGE:
              //   - list NFT for 1000 USDC
              //   - mock price feeds: USDC/USD = $1, DAI/USD = $1
              //   - expected DAI needed = 1000 DAI
              // ACT: buyer.buyItem(nftAddress, tokenId, DAI)
              // ASSERT: NFT owner == buyer
              // ASSERT: seller proceeds[DAI] == 1000e18

              it("handles different decimal tokens correctly (6 vs 18)");
              // ARRANGE:
              //   - list NFT for 1000 USDC (6 decimals)
              //   - mock price feeds: USDC/USD = $1, WETH/USD = $2800
              //   - expected WETH = 1000/2800 = 0.357142857142857142 WETH (18 decimals)
              // ACT: buyer.buyItem(nftAddress, tokenId, WETH)
              // ASSERT: conversion maintains precision
              // ASSERT: seller proceeds[WETH] == 357142857142857142 (wei units)

              it("reverts if converted amount is insufficient");
              // ARRANGE:
              //   - list NFT for 1000 USDC
              //   - ETH/USD = $2800, need 0.357 ETH
              // ACT: buyer.buyItem{value: 0.3 ether}(nftAddress, tokenId, ETH)
              // ASSERT: reverts with PriceNotMet

              it("stores proceeds in buyer's payment token, not listing token");
              // ARRANGE: list for USDC
              // ACT: buy with ETH
              // ASSERT: seller proceeds[ETH] > 0
              // ASSERT: seller proceeds[USDC] == 0
          });

          // ============================================================================
          // BUYING - EDGE CASES
          // ============================================================================

          describe("buyItem - Edge Cases", () => {
              it("reverts if NFT not listed");
              // ACT: buyItem(nftAddress, unlisted_tokenId, ETH)
              // ASSERT: reverts with NotListed

              it("reverts when trying to buy with unsupported token");
              // ARRANGE: list NFT in ETH
              // ACT: buyItem(nftAddress, tokenId, RANDOM_UNSUPPORTED_TOKEN)
              // ASSERT: reverts with TokenNotSupported

              it("reverts if price feed returns 0 or negative");
              // ARRANGE: mock price feed to return 0
              // ACT: buyItem with cross-token conversion
              // ASSERT: reverts with "Invalid price from feed"

              it("handles NFT transfer after listing (seller no longer owns)");
              // ARRANGE: seller lists NFT, then transfers it away
              // ACT: buyer tries to buy
              // ASSERT: reverts (safeTransferFrom fails)

              it("handles approval removal after listing");
              // ARRANGE: seller lists NFT, then removes marketplace approval
              // ACT: buyer tries to buy
              // ASSERT: reverts (safeTransferFrom fails)

              it("protects against reentrancy");
              // ARRANGE: create malicious NFT that tries to reenter on safeTransferFrom
              // ACT: buy the malicious NFT
              // ASSERT: reentrancy blocked by nonReentrant modifier

              it("emits ItemBought event with correct payment token");
              // ACT: buy with ETH when listed in USDC
              // ASSERT: event emitted with paymentToken == ETH (buyer's token)
          });

          // ============================================================================
          // UPDATE LISTING
          // ============================================================================

          describe("updateListing", () => {
              it("updates price and payment token");
              // ARRANGE: list for 1 ETH
              // ACT: updateListing(nftAddress, tokenId, 2000e6, USDC)
              // ASSERT: listing.price == 2000e6
              // ASSERT: listing.paymentToken == USDC

              it("reverts if not owner");
              // ARRANGE: seller lists NFT
              // ACT: attacker.updateListing(...)
              // ASSERT: reverts with NotOwner

              it("reverts if not listed");
              // ACT: updateListing(unlisted_tokenId, ...)
              // ASSERT: reverts with NotListed

              it("reverts if new price is zero");
              // ACT: updateListing(..., 0, ETH)
              // ASSERT: reverts with PriceMustBeAboveZero

              it("reverts when updating to unsupported token");
              // ACT: updateListing(..., 1000, UNSUPPORTED_TOKEN)
              // ASSERT: reverts with TokenNotSupported

              it("emits ItemListed event after update");
              // ACT: updateListing(...)
              // ASSERT: ItemListed event emitted
          });

          // ============================================================================
          // CANCEL LISTING
          // ============================================================================

          describe("cancelListing", () => {
              it("allows owner to cancel listing");
              // ARRANGE: list NFT
              // ACT: seller.cancelListing(nftAddress, tokenId)
              // ASSERT: listing deleted (price == 0)

              it("reverts if not owner");
              // ARRANGE: seller lists NFT
              // ACT: attacker.cancelListing(...)
              // ASSERT: reverts with NotOwner

              it("reverts if not listed");
              // ACT: cancelListing(unlisted_tokenId)
              // ASSERT: reverts with NotListed

              it("emits ItemCanceled event");
              // ACT: cancelListing(...)
              // ASSERT: event emitted

              it("allows relisting after cancellation");
              // ARRANGE: list, cancel
              // ACT: list again
              // ASSERT: successfully listed
          });

          // ============================================================================
          // WITHDRAW PROCEEDS
          // ============================================================================

          describe("withdrawProceeds", () => {
              it("allows seller to withdraw ETH proceeds");
              // ARRANGE: sell NFT for ETH, seller has 1 ETH proceeds
              // ACT: seller.withdrawProceeds(ETH)
              // ASSERT: seller ETH balance increased by 1 ether
              // ASSERT: seller proceeds[ETH] == 0

              it("allows seller to withdraw ERC20 proceeds");
              // ARRANGE: sell NFT for USDC, seller has 1000 USDC proceeds
              // ACT: seller.withdrawProceeds(USDC)
              // ASSERT: seller USDC balance increased by 1000e6
              // ASSERT: seller proceeds[USDC] == 0

              it("reverts if no proceeds");
              // ACT: seller.withdrawProceeds(ETH) when proceeds == 0
              // ASSERT: reverts with NoProceeds

              it("allows withdrawing different tokens separately");
              // ARRANGE:
              //   - sell NFT1 for ETH → seller has 1 ETH proceeds
              //   - sell NFT2 for USDC → seller has 1000 USDC proceeds
              // ACT: withdraw ETH
              // ASSERT: ETH withdrawn, USDC proceeds unchanged
              // ACT: withdraw USDC
              // ASSERT: USDC withdrawn

              it("protects against reentrancy");
              // ARRANGE: create malicious receiver that reenters on receive()
              // ACT: withdraw ETH
              // ASSERT: reentrancy blocked

              it("reverts on failed ETH transfer");
              // ARRANGE: seller is contract that rejects ETH
              // ACT: withdraw ETH
              // ASSERT: reverts with TransferFailed

              it("reverts on failed ERC20 transfer");
              // ARRANGE: mock ERC20 to return false on transfer
              // ACT: withdraw ERC20
              // ASSERT: reverts with TransferFailed
          });

          // ============================================================================
          // VIEW FUNCTIONS
          // ============================================================================

          describe("View Functions", () => {
              describe("getListing", () => {
                  it("returns correct listing information");
                  // ARRANGE: list NFT for 1000 USDC
                  // ACT: getListing(nftAddress, tokenId)
                  // ASSERT: returns {price: 1000e6, seller: seller, paymentToken: USDC}

                  it("returns zero price for unlisted items");
                  // ACT: getListing(nftAddress, unlisted_tokenId)
                  // ASSERT: price == 0
              });

              describe("getProceeds", () => {
                  it("returns correct proceeds for each token");
                  // ARRANGE: seller has 1 ETH and 1000 USDC proceeds
                  // ACT: getProceeds(seller, ETH)
                  // ASSERT: returns 1 ether
                  // ACT: getProceeds(seller, USDC)
                  // ASSERT: returns 1000e6

                  it("returns 0 for addresses with no proceeds");
                  // ACT: getProceeds(randomAddress, ETH)
                  // ASSERT: returns 0
              });

              describe("getListingPriceInToken", () => {
                  it(
                      "returns same price when target token matches listing token",
                  );
                  // ARRANGE: list for 1 ETH
                  // ACT: getListingPriceInToken(nftAddress, tokenId, ETH)
                  // ASSERT: returns 1 ether

                  it("correctly converts ETH price to USDC");
                  // ARRANGE: list for 1 ETH, ETH/USD = $2800
                  // ACT: getListingPriceInToken(nftAddress, tokenId, USDC)
                  // ASSERT: returns 2800e6

                  it("correctly converts USDC price to ETH");
                  // ARRANGE: list for 1000 USDC, ETH/USD = $2800
                  // ACT: getListingPriceInToken(nftAddress, tokenId, ETH)
                  // ASSERT: returns ~0.357 ether

                  it("reverts if NFT not listed");
                  // ACT: getListingPriceInToken(nftAddress, unlisted_tokenId, ETH)
                  // ASSERT: reverts with NotListed

                  it("reverts if target token not supported");
                  // ACT: getListingPriceInToken(nftAddress, tokenId, UNSUPPORTED_TOKEN)
                  // ASSERT: reverts with TokenNotSupported
              });
          });

          // ============================================================================
          // INTEGRATION TESTS
          // ============================================================================

          describe("Integration Tests", () => {
              it("complete flow: list in USDC, buy with ETH, withdraw ETH");
              // ARRANGE: seller mints NFT, approves marketplace
              // ACT: seller lists for 1000 USDC
              // ACT: buyer buys with 0.357 ETH (converted from $1000)
              // ASSERT: buyer owns NFT
              // ASSERT: seller has 0.357 ETH proceeds
              // ACT: seller withdraws ETH
              // ASSERT: seller received 0.357 ETH

              it("seller accumulates proceeds in multiple tokens");
              // ARRANGE: seller has 3 NFTs
              // ACT: sell NFT1 for ETH → buyer pays ETH
              // ACT: sell NFT2 for USDC → buyer pays DAI (cross-token)
              // ACT: sell NFT3 for ETH → buyer pays USDC (cross-token)
              // ASSERT: seller proceeds[ETH] > 0
              // ASSERT: seller proceeds[DAI] > 0
              // ASSERT: seller proceeds[USDC] > 0
              // ACT: withdraw each token separately
              // ASSERT: all proceeds withdrawn successfully

              it(
                  "multiple buyers using different payment tokens for same listing type",
              );
              // ARRANGE: seller lists 3 NFTs, all for 1000 USDC
              // ACT: buyer1 buys NFT1 with USDC (same token)
              // ACT: buyer2 buys NFT2 with ETH (cross-token)
              // ACT: buyer3 buys NFT3 with DAI (cross-token)
              // ASSERT: seller proceeds[USDC] == 1000e6
              // ASSERT: seller proceeds[ETH] > 0
              // ASSERT: seller proceeds[DAI] > 0

              it("handles price feed updates between list and buy");
              // ARRANGE: list NFT for 1 ETH when ETH = $2800
              // ACT: update mock price feed to ETH = $3000
              // ACT: buyer buys with USDC
              // ASSERT: buyer pays 3000 USDC (new price)
          });

          // ============================================================================
          // PRECISION & DECIMAL TESTS
          // ============================================================================

          describe("Decimal Precision Tests", () => {
              it("handles 6 decimal (USDC) to 18 decimal (ETH) conversion");
              // ARRANGE: list for 1,000,000 USDC (6 decimals)
              // ACT: convert to ETH (18 decimals)
              // ASSERT: no precision loss, correct wei amount

              it("handles 18 decimal (ETH) to 6 decimal (USDC) conversion");
              // ARRANGE: list for 1.123456789012345678 ETH
              // ACT: convert to USDC
              // ASSERT: correctly rounds/truncates to 6 decimals

              it("handles very large amounts without overflow");
              // ARRANGE: list for 1,000,000 ETH
              // ACT: convert to USDC
              // ASSERT: calculation doesn't overflow, result is correct

              it("handles very small amounts with minimal precision loss");
              // ARRANGE: list for 0.000001 ETH
              // ACT: convert to USDC
              // ASSERT: doesn't round to 0, maintains reasonable precision
          });

          // ============================================================================
          // SECURITY TESTS
          // ============================================================================

          describe("Security Tests", () => {
              it("prevents reentrancy on buyItem");
              // Already covered above

              it("prevents reentrancy on withdrawProceeds");
              // Already covered above

              it(
                  "validates all token addresses are supported before operations",
              );
              // Test that isTokenSupported modifier works on all functions

              it("prevents integer overflow in price conversions");
              // Test extreme values in PriceConverter

              it(
                  "handles malicious ERC20 (returns false instead of reverting)",
              );
              // Mock ERC20 that returns false on transfer
              // ASSERT: contract reverts with TransferFailed
          });
      });
