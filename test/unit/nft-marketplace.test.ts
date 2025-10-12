import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { assert, expect } from "chai";
import { network, ethers } from "hardhat";
import hre from "hardhat";
import { developmentChains } from "../../helper-hardhat.config";
import { NftMarketplace, BasicNft, MockERC20 } from "../../typechain-types";
import MocksModule from "../../ignition/modules/mock";
import NftMarketPlaceModule from "../../ignition/modules/nft-marketplace";
import BasicNftModule from "../../ignition/modules/basic-nft";
import MockErc20Module from "../../ignition/modules/mock-erc20";

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Nft Marketplace Unit Tests", function () {
          let nftMarketplace: NftMarketplace,
              nftMarketplaceContract: NftMarketplace,
              basicNft: BasicNft,
              mockUsdc: MockERC20;

          const PRICE = ethers.parseEther("1");

          const TOKEN_ID = 0;

          const NATIVE_TOKEN = ethers.ZeroAddress;

          let deployer: SignerWithAddress;

          let user1: SignerWithAddress;

          let user2: SignerWithAddress;

          let priceFeedAddress: string;

          let USDC: string;

          let usdcPriceFeed: string;

          const USDC_PRICE = 1000_000000n;

          const ETH_USD_PRICE = 4000_00000000n; // $4000
          const USDC_USD_PRICE = 1_00000000n; // $1

          beforeEach(async () => {
              const accounts = await ethers.getSigners();

              deployer = accounts[0];

              user1 = accounts[1];

              user2 = accounts[2];

              // Deploy BasicNFT
              const basicNftDeployed =
                  await hre.ignition.deploy(BasicNftModule);

              const basicNFT = basicNftDeployed.basicNft;

              const basicNftAddress = await basicNFT.getAddress();
              basicNft = (await ethers.getContractAt(
                  "BasicNft",
                  basicNftAddress,
              )) as BasicNft;

              // Deploy Mocks (Price Feeds)
              const mocks = await hre.ignition.deploy(MocksModule);

              priceFeedAddress = await mocks.ethPriceFeed.getAddress();

              usdcPriceFeed = await mocks.usdcPriceFeed.getAddress();

              // Deploy MockERC20 (USDC)
              const mockErc20Deployed = await hre.ignition.deploy(
                  MockErc20Module,
                  {
                      parameters: {
                          MockErc20Module: {
                              name: "USD Coin",
                              symbol: "USDC",
                              decimals: 6,
                          },
                      },
                  },
              );

              const mockERC20 = mockErc20Deployed.mockErc20;

              const mockErc20Address = await mockERC20.getAddress();

              mockUsdc = (await ethers.getContractAt(
                  "MockERC20",
                  mockErc20Address,
              )) as MockERC20;

              // Set USDC address for use in tests
              USDC = mockErc20Address;

              // Deploy NFT Marketplace
              const nftMarketplaceDeployed = await hre.ignition.deploy(
                  NftMarketPlaceModule,
                  {
                      parameters: {
                          NFTMarketPlaceModule: {
                              priceFeed: priceFeedAddress,
                          },
                      },
                  },
              );

              const nftMarketPlace = nftMarketplaceDeployed.nftMarketPlace;

              const nftMarketPlaceAddress = await nftMarketPlace.getAddress();

              nftMarketplaceContract = (await ethers.getContractAt(
                  "NftMarketplace",
                  nftMarketPlaceAddress,
              )) as NftMarketplace;
              nftMarketplace = nftMarketplaceContract.connect(deployer);

              // Setup: Mint NFT and approve marketplace
              await basicNft.connect(deployer).mintNft();

              await basicNft
                  .connect(deployer)
                  .approve(nftMarketPlaceAddress, TOKEN_ID);

              // Add USDC support to marketplace
              await nftMarketplace.addSupportedToken(USDC, usdcPriceFeed, 6);

              // Mint USDC to buyer
              await mockUsdc.mint(user1.address, ethers.parseUnits("10000", 6));
          });

          // ============================================================================
          // SETUP & CONSTRUCTOR
          // ============================================================================

          describe("Constructor", function () {
              it("initializes with contract owner", async function () {
                  const owner = await nftMarketplace.getOwner();

                  assert.equal(owner, deployer.address);
              });

              it("sets up native ETH token support by default", async function () {
                  const isSupported =
                      await nftMarketplace.isTokenSupportedPublic(NATIVE_TOKEN);

                  expect(isSupported).to.be.true;
              });

              it("correctly configures ETH price feed", async function () {
                  const tokenInfo =
                      await nftMarketplace.getTokenInfo(NATIVE_TOKEN);

                  assert.equal(tokenInfo.priceFeed, priceFeedAddress);

                  assert.equal(tokenInfo.decimals, BigInt(18));
              });
          });

          // ============================================================================
          // TOKEN MANAGEMENT
          // ============================================================================

          describe("Token Management", () => {
              describe("addSupportedToken", () => {
                  it("allows owner to add new supported tokens", async function () {
                      // ACT: owner.addSupportedToken(USDC, usdcPriceFeed, 6)
                      await nftMarketplace.addSupportedToken(
                          USDC,
                          usdcPriceFeed,
                          6,
                      );

                      // ASSERT: isTokenSupported(USDC) == true
                      const isSupported =
                          await nftMarketplace.isTokenSupportedPublic(USDC);
                      expect(isSupported).to.be.true;

                      // ASSERT: getTokenInfo(USDC).decimals == 6
                      const tokenInfo = await nftMarketplace.getTokenInfo(USDC);
                      assert.equal(tokenInfo.decimals, BigInt(6));
                      assert.equal(tokenInfo.priceFeed, usdcPriceFeed);
                  });

                  it("reverts when non-owner tries to add tokens", async function () {
                      // HINT: Use .connect() to switch signer
                      await expect(
                          nftMarketplace
                              .connect(user1)
                              .addSupportedToken(USDC, usdcPriceFeed, 6),
                      ).to.be.revertedWith("Not contract owner");
                  });

                  it("emits TokenAdded event", async function () {
                      await expect(
                          nftMarketplace.addSupportedToken(
                              USDC,
                              usdcPriceFeed,
                              6,
                          ),
                      )
                          .to.emit(nftMarketplace, "TokenAdded")
                          .withArgs(USDC, usdcPriceFeed, 6);
                  });
              });

              describe("removeSupportedToken", () => {
                  it("allows owner to remove supported tokens", async function () {
                      await nftMarketplace.removeSupportedToken(USDC);

                      const isSupported =
                          await nftMarketplace.isTokenSupportedPublic(USDC);

                      expect(isSupported).to.be.false;
                  });

                  it("reverts when non-owner tries to remove tokens", async function () {
                      await expect(
                          nftMarketplace
                              .connect(user1)
                              .removeSupportedToken(USDC),
                      ).to.be.revertedWith("Not contract owner");
                  });

                  it("prevents NEW listings with removed token", async function () {
                      // Remove USDC support
                      await nftMarketplace.removeSupportedToken(USDC);

                      // ACT: Try to list with removed token

                      await expect(
                          nftMarketplace.listItem(
                              await basicNft.getAddress(),
                              TOKEN_ID,
                              1000,
                              USDC,
                          ),
                      ).to.be.revertedWithCustomError(
                          nftMarketplace,
                          "NftMarketplace__TokenNotSupported",
                      );
                  });

                  it("prevents buying with removed token", async function () {
                      await nftMarketplace.listItem(
                          await basicNft.getAddress(),
                          TOKEN_ID,
                          PRICE,
                          NATIVE_TOKEN,
                      );

                      // Remove USDC support
                      await nftMarketplace.removeSupportedToken(USDC);

                      // ACT: Try to list with removed token
                      await expect(
                          nftMarketplace
                              .connect(user1)
                              .buyItem(basicNft.getAddress(), TOKEN_ID, USDC),
                      ).to.be.revertedWithCustomError(
                          nftMarketplace,
                          "NftMarketplace__TokenNotSupported",
                      );
                  });
              });
          });

          // ============================================================================
          // LISTING
          // ============================================================================

          describe("listItem", () => {
              let nftAddress: string;

              beforeEach(async function () {
                  // Store it once
                  nftAddress = await basicNft.getAddress();

                  // Mint and approve
                  await basicNft.mintNft();
              });

              it("lists NFT with correct price and payment token", async function () {
                  await basicNft.approve(
                      await nftMarketplace.getAddress(),
                      TOKEN_ID,
                  );

                  await nftMarketplace.listItem(
                      nftAddress,
                      TOKEN_ID,
                      PRICE,
                      NATIVE_TOKEN,
                  );

                  const listingInfo = await nftMarketplace.getListing(
                      nftAddress,
                      TOKEN_ID,
                  );

                  assert.equal(listingInfo.price, PRICE);
                  assert.equal(listingInfo.seller, deployer.address);
                  assert.equal(listingInfo.paymentToken, NATIVE_TOKEN);
              });

              it("reverts if price is zero", async function () {
                  let price = 0n;

                  await expect(
                      nftMarketplace.listItem(
                          await basicNft.getAddress(),
                          TOKEN_ID,
                          price,
                          NATIVE_TOKEN,
                      ),
                  ).to.be.revertedWithCustomError(
                      nftMarketplace,
                      "NftMarketplace__PriceMustBeAboveZero",
                  );
              });

              it("reverts if not approved", async function () {
                  const UNAPPROVED_TOKEN_ID = 1;

                  await expect(
                      nftMarketplace.listItem(
                          nftAddress,
                          UNAPPROVED_TOKEN_ID,
                          PRICE,
                          NATIVE_TOKEN,
                      ),
                  ).to.be.revertedWithCustomError(
                      nftMarketplace,
                      "NftMarketplace__NotApprovedForMarketplace",
                  );
              });

              it("reverts if not owner", async function () {
                  await basicNft.connect(user1).mintNft();

                  await expect(
                      nftMarketplace
                          .connect(user2)
                          .listItem(nftAddress, TOKEN_ID, PRICE, NATIVE_TOKEN),
                  ).to.be.revertedWithCustomError(
                      nftMarketplace,
                      "NftMarketplace__NotOwner",
                  );
              });

              it("reverts if already listed", async function () {
                  await nftMarketplace.listItem(
                      nftAddress,
                      TOKEN_ID,
                      PRICE,
                      NATIVE_TOKEN,
                  );

                  await expect(
                      nftMarketplace.listItem(
                          nftAddress,
                          TOKEN_ID,
                          PRICE,
                          NATIVE_TOKEN,
                      ),
                  ).to.be.revertedWithCustomError(
                      nftMarketplace,
                      "NftMarketplace__AlreadyListed",
                  );
              });

              it("emits ItemListed event", async function () {
                  await expect(
                      nftMarketplace.listItem(
                          nftAddress,
                          TOKEN_ID,
                          PRICE,
                          NATIVE_TOKEN,
                      ),
                  )
                      .to.emit(nftMarketplace, "ItemListed")
                      .withArgs(
                          deployer.address,
                          nftAddress,
                          TOKEN_ID,
                          PRICE,
                          NATIVE_TOKEN,
                      );
              });
          });

          // ============================================================================
          // BUYING - SAME TOKEN
          // ============================================================================

          describe("buyItem - Same Token Payment", () => {
              let nftAddress: string;

              let nftMarketPlaceAddress: string;

              beforeEach(async function () {
                  // Store it once
                  nftAddress = await basicNft.getAddress();

                  nftMarketPlaceAddress = await nftMarketplace.getAddress();
              });

              it("allows buying with ETH when listed in ETH", async function () {
                  await nftMarketplace.listItem(
                      nftAddress,
                      TOKEN_ID,
                      PRICE,
                      NATIVE_TOKEN,
                  );

                  await nftMarketplace
                      .connect(user2)
                      .buyItem(nftAddress, TOKEN_ID, NATIVE_TOKEN, {
                          value: PRICE,
                      });

                  // ASSERT: NFT owner is now the buyer
                  const newOwner = await basicNft.ownerOf(TOKEN_ID);
                  assert.equal(newOwner, user2.address);

                  // ASSERT: Seller has proceeds in ETH
                  const sellerProceeds = await nftMarketplace.getProceeds(
                      deployer.address,
                      NATIVE_TOKEN,
                  );
                  assert.equal(sellerProceeds, PRICE);

                  // ASSERT: Listing is deleted
                  const listing = await nftMarketplace.getListing(
                      nftAddress,
                      TOKEN_ID,
                  );
                  assert.equal(listing.price, 0n);
              });

              it("allows buying with ERC20 when listed in same ERC20", async function () {
                  await nftMarketplace.listItem(
                      nftAddress,
                      TOKEN_ID,
                      USDC_PRICE,
                      USDC,
                  );

                  await mockUsdc
                      .connect(user1)
                      .approve(nftMarketPlaceAddress, USDC_PRICE);

                  await nftMarketplace
                      .connect(user1)
                      .buyItem(nftAddress, TOKEN_ID, USDC);

                  expect(await basicNft.ownerOf(TOKEN_ID)).to.equal(
                      user1.address,
                  );
                  expect(
                      await nftMarketplace.getProceeds(deployer.address, USDC),
                  ).to.equal(USDC_PRICE);
              });

              it("reverts if ETH amount sent is insufficient", async function () {
                  await nftMarketplace.listItem(
                      nftAddress,
                      TOKEN_ID,
                      PRICE,
                      NATIVE_TOKEN,
                  );

                  await expect(
                      nftMarketplace
                          .connect(user2)
                          .buyItem(nftAddress, TOKEN_ID, NATIVE_TOKEN, {
                              value: PRICE / 2n,
                          }),
                  ).to.be.revertedWithCustomError(
                      nftMarketplace,
                      "NftMarketplace__PriceNotMet",
                  );
              });

              it("reverts if ERC20 allowance is insufficient", async function () {
                  await nftMarketplace.listItem(
                      nftAddress,
                      TOKEN_ID,
                      USDC_PRICE,
                      USDC,
                  );

                  // Approve only half the needed amount
                  await mockUsdc
                      .connect(user1)
                      .approve(nftMarketPlaceAddress, USDC_PRICE / 2n);

                  await expect(
                      nftMarketplace
                          .connect(user1)
                          .buyItem(nftAddress, TOKEN_ID, USDC),
                  ).to.be.reverted;
              });

              it("reverts if ERC20 balance is insufficient", async function () {
                  await nftMarketplace.listItem(
                      nftAddress,
                      TOKEN_ID,
                      USDC_PRICE,
                      USDC,
                  );

                  // user2 has no USDC, but approve anyway
                  await mockUsdc
                      .connect(user2)
                      .approve(nftMarketPlaceAddress, USDC_PRICE);

                  await expect(
                      nftMarketplace
                          .connect(user2)
                          .buyItem(nftAddress, TOKEN_ID, USDC),
                  ).to.be.reverted;
              });
          });

          // ============================================================================
          // BUYING - CROSS TOKEN (CHAINLINK CONVERSION)
          // ============================================================================

          describe("buyItem - Cross Token Payment", () => {
              let nftAddress: string;

              beforeEach(async function () {
                  nftAddress = await basicNft.getAddress();
              });

              it("allows buying with ETH when listed in USDC", async function () {
                  await nftMarketplace.listItem(
                      nftAddress,
                      TOKEN_ID,
                      USDC_PRICE,
                      USDC,
                  );

                  const expectedEthAmount =
                      (USDC_PRICE * 10n ** 18n * USDC_USD_PRICE) /
                      (ETH_USD_PRICE * 10n ** 6n);

                  await nftMarketplace
                      .connect(user1)
                      .buyItem(nftAddress, TOKEN_ID, NATIVE_TOKEN, {
                          value: expectedEthAmount,
                      });

                  expect(await basicNft.ownerOf(TOKEN_ID)).to.equal(
                      user1.address,
                  );

                  // Seller receives ETH, not USDC
                  const proceeds = await nftMarketplace.getProceeds(
                      deployer.address,
                      NATIVE_TOKEN,
                  );
                  expect(proceeds).to.equal(expectedEthAmount);
              });

              it("allows buying with USDC when listed in ETH", async function () {
                  await nftMarketplace.listItem(
                      nftAddress,
                      TOKEN_ID,
                      PRICE,
                      NATIVE_TOKEN,
                  );

                  const expectedUsdcAmount =
                      (PRICE * ETH_USD_PRICE) / (USDC_USD_PRICE * 10n ** 12n);

                  await mockUsdc
                      .connect(user1)
                      .approve(
                          await nftMarketplace.getAddress(),
                          expectedUsdcAmount,
                      );

                  const user1UsdcBefore = await mockUsdc.balanceOf(
                      user1.address,
                  );

                  // ACT: Buy with USDC
                  await nftMarketplace
                      .connect(user1)
                      .buyItem(nftAddress, TOKEN_ID, USDC);

                  // ASSERT: NFT owner is buyer
                  expect(await basicNft.ownerOf(TOKEN_ID)).to.equal(
                      user1.address,
                  );

                  // ASSERT: Seller proceeds in USDC, NOT ETH
                  const sellerUsdcProceeds = await nftMarketplace.getProceeds(
                      deployer.address,
                      USDC,
                  );
                  expect(sellerUsdcProceeds).to.equal(expectedUsdcAmount);

                  const sellerEthProceeds = await nftMarketplace.getProceeds(
                      deployer.address,
                      NATIVE_TOKEN,
                  );
                  expect(sellerEthProceeds).to.equal(0n);

                  // ASSERT: Buyer USDC decreased
                  const user1UsdcAfter = await mockUsdc.balanceOf(
                      user1.address,
                  );
                  expect(user1UsdcBefore - user1UsdcAfter).to.equal(
                      expectedUsdcAmount,
                  );
              });

              it("handles different decimal tokens correctly (6 vs 18)", async function () {
                  await nftMarketplace.listItem(
                      nftAddress,
                      TOKEN_ID,
                      PRICE,
                      NATIVE_TOKEN,
                  );

                  const expectedUsdcAmount =
                      (PRICE * ETH_USD_PRICE) / (USDC_USD_PRICE * 10n ** 12n);

                  // Approve marketplace to spend USDC
                  await mockUsdc
                      .connect(user1)
                      .approve(
                          await nftMarketplace.getAddress(),
                          expectedUsdcAmount,
                      );

                  const user1UsdcBefore = await mockUsdc.balanceOf(
                      user1.address,
                  );

                  // ACT: Buy with USDC
                  await nftMarketplace
                      .connect(user1)
                      .buyItem(nftAddress, TOKEN_ID, USDC);

                  // ASSERT: NFT owner is buyer
                  expect(await basicNft.ownerOf(TOKEN_ID)).to.equal(
                      user1.address,
                  );

                  // ASSERT: Seller proceeds in USDC, NOT ETH
                  const sellerUsdcProceeds = await nftMarketplace.getProceeds(
                      deployer.address,
                      USDC,
                  );
                  expect(sellerUsdcProceeds).to.equal(expectedUsdcAmount);

                  const sellerEthProceeds = await nftMarketplace.getProceeds(
                      deployer.address,
                      NATIVE_TOKEN,
                  );
                  expect(sellerEthProceeds).to.equal(0n);

                  // ASSERT: Buyer USDC decreased
                  const user1UsdcAfter = await mockUsdc.balanceOf(
                      user1.address,
                  );
                  expect(user1UsdcBefore - user1UsdcAfter).to.equal(
                      expectedUsdcAmount,
                  );
              });

              it("reverts if converted amount is insufficient", async function () {
                  // ARRANGE: List for 1000 USDC
                  await nftMarketplace.listItem(
                      nftAddress,
                      TOKEN_ID,
                      USDC_PRICE,
                      USDC,
                  );

                  // Get required ETH amount
                  const requiredEth =
                      await nftMarketplace.getListingPriceInToken(
                          nftAddress,
                          TOKEN_ID,
                          NATIVE_TOKEN,
                      );

                  // ACT & ASSERT: Send insufficient ETH
                  const insufficientAmount =
                      requiredEth - ethers.parseEther("0.1");

                  await expect(
                      nftMarketplace
                          .connect(user1)
                          .buyItem(nftAddress, TOKEN_ID, NATIVE_TOKEN, {
                              value: insufficientAmount,
                          }),
                  ).to.be.revertedWithCustomError(
                      nftMarketplace,
                      "NftMarketplace__PriceNotMet",
                  );
              });

              it("stores proceeds in buyer's payment token, not listing token", async function () {
                  await nftMarketplace.listItem(
                      nftAddress,
                      TOKEN_ID,
                      USDC_PRICE,
                      USDC,
                  );

                  // Get required ETH
                  const requiredEth =
                      await nftMarketplace.getListingPriceInToken(
                          nftAddress,
                          TOKEN_ID,
                          NATIVE_TOKEN,
                      );

                  // ACT: Buy with ETH (cross-token payment)
                  await nftMarketplace
                      .connect(user1)
                      .buyItem(nftAddress, TOKEN_ID, NATIVE_TOKEN, {
                          value: requiredEth,
                      });

                  // ASSERT: Seller has ETH proceeds, NOT USDC
                  const sellerEthProceeds = await nftMarketplace.getProceeds(
                      deployer.address,
                      NATIVE_TOKEN,
                  );
                  expect(sellerEthProceeds).to.be.gt(0n);
                  expect(sellerEthProceeds).to.equal(requiredEth);

                  const sellerUsdcProceeds = await nftMarketplace.getProceeds(
                      deployer.address,
                      USDC,
                  );
                  expect(sellerUsdcProceeds).to.equal(0n);
              });
          });

          // ============================================================================
          // BUYING - EDGE CASES
          // ============================================================================

          describe("buyItem - Edge Cases", () => {
              let nftAddress: string;

              beforeEach(async function () {
                  nftAddress = await basicNft.getAddress();
              });

              it("reverts if NFT not listed", async function () {
                  const UNLISTED_TOKEN_ID = 999;

                  // ACT & ASSERT: Try to buy unlisted NFT
                  await expect(
                      nftMarketplace
                          .connect(user1)
                          .buyItem(
                              nftAddress,
                              UNLISTED_TOKEN_ID,
                              NATIVE_TOKEN,
                              {
                                  value: PRICE,
                              },
                          ),
                  ).to.be.revertedWithCustomError(
                      nftMarketplace,
                      "NftMarketplace__NotListed",
                  );
              });

              it("reverts when trying to buy with unsupported token", async function () {
                  // ARRANGE: List NFT in ETH
                  await nftMarketplace.listItem(
                      nftAddress,
                      TOKEN_ID,
                      PRICE,
                      NATIVE_TOKEN,
                  );

                  const RANDOM_UNSUPPORTED_TOKEN =
                      "0x1234567890123456789012345678901234567890";

                  // ACT & ASSERT: Try to buy with unsupported token
                  await expect(
                      nftMarketplace
                          .connect(user1)
                          .buyItem(
                              nftAddress,
                              TOKEN_ID,
                              RANDOM_UNSUPPORTED_TOKEN,
                          ),
                  ).to.be.revertedWithCustomError(
                      nftMarketplace,
                      "NftMarketplace__TokenNotSupported",
                  );
              });

              it("handles NFT transfer after listing (seller no longer owns)", async function () {
                  // ARRANGE: List NFT
                  await nftMarketplace.listItem(
                      nftAddress,
                      TOKEN_ID,
                      PRICE,
                      NATIVE_TOKEN,
                  );

                  // Transfer NFT away from seller
                  await basicNft
                      .connect(deployer)
                      .transferFrom(deployer.address, user2.address, TOKEN_ID);

                  // ACT & ASSERT: Buyer tries to buy (should fail because seller no longer owns it)
                  await expect(
                      nftMarketplace
                          .connect(user1)
                          .buyItem(nftAddress, TOKEN_ID, NATIVE_TOKEN, {
                              value: PRICE,
                          }),
                  ).to.be.reverted; // safeTransferFrom will fail
              });

              it("handles approval removal after listing", async function () {
                  // ARRANGE: List NFT
                  await nftMarketplace.listItem(
                      nftAddress,
                      TOKEN_ID,
                      PRICE,
                      NATIVE_TOKEN,
                  );

                  // Remove marketplace approval
                  await basicNft
                      .connect(deployer)
                      .approve(ethers.ZeroAddress, TOKEN_ID);

                  // ACT & ASSERT: Buyer tries to buy (should fail due to no approval)
                  await expect(
                      nftMarketplace
                          .connect(user1)
                          .buyItem(nftAddress, TOKEN_ID, NATIVE_TOKEN, {
                              value: PRICE,
                          }),
                  ).to.be.reverted; // safeTransferFrom will fail due to no approval
              });

              it("emits ItemBought event with correct payment token", async function () {
                  // ARRANGE: List NFT in USDC
                  await nftMarketplace.listItem(
                      nftAddress,
                      TOKEN_ID,
                      USDC_PRICE,
                      USDC,
                  );

                  // Get required ETH amount
                  const requiredEth =
                      await nftMarketplace.getListingPriceInToken(
                          nftAddress,
                          TOKEN_ID,
                          NATIVE_TOKEN,
                      );

                  // ACT & ASSERT: Buy with ETH and check event
                  await expect(
                      nftMarketplace
                          .connect(user1)
                          .buyItem(nftAddress, TOKEN_ID, NATIVE_TOKEN, {
                              value: requiredEth,
                          }),
                  )
                      .to.emit(nftMarketplace, "ItemBought")
                      .withArgs(
                          user1.address, // buyer
                          nftAddress, // nftAddress
                          TOKEN_ID, // tokenId
                          requiredEth, // price (in buyer's token)
                          NATIVE_TOKEN, // paymentToken (buyer's token, not listing token!)
                      );
              });
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
