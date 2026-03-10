/** biome-ignore-all lint/style/noNonNullAssertion: <> */
import { expect, test } from "bun:test";
//Tutorial: <https://litesvm.github.io/litesvm/tutorial.html>
import { Connection, type Keypair, type PublicKey } from "@solana/web3.js";
import { Status } from "./decoder";
import {
	acctExists,
	acctIsNull,
	ataBalCk,
	configPDA,
	depositSol,
	findPdaV1,
	getAta,
	initConfig,
	initSolBalc,
	lgcDeposit,
	lgcInitAta,
	lgcInitMint,
	lgcMintToken,
	lgcPay,
	lgcRedeem,
	lgcWithdraw,
	type PdaOut,
	setAtaCheck,
	setMint,
	svm,
	vault1,
	vaultAta1,
	vaultO,
} from "./litesvm-utils";
import { as6zBn, as9zBn, bigintAmt, ll } from "./utils";
import {
	admin,
	adminKp,
	dgcAuthorityKp,
	dragonCoinKp,
	hacker,
	owner,
	ownerKp,
	pyusdMint,
	usdcMint,
	usdgMint,
	usdtMint,
	user1,
	user1Kp,
	user2,
	user3,
} from "./web3jsSetup";

let signerKp: Keypair;
let mintKp: Keypair;
let mintAuthorityKp: Keypair;
let signer: PublicKey;
let user: PublicKey;
let mint: PublicKey;
let mintAuthority: PublicKey;
let ata: PublicKey;
let fromAta: PublicKey;
let toAta: PublicKey;
let vaultOut: PdaOut;
let decimals = 9;
let amt: bigint;
let balcBf: bigint | null;
let balcAf: bigint | null;
const decDgc = 9;
const initDgcBalc = bigintAmt(9000, decDgc);
const initUsdcBalc = bigintAmt(1000, 6);
//const vaultRent = 1002240n; //from Rust

balcBf = svm.getBalance(admin);
ll("admin SOL:", balcBf);
expect(balcBf).toStrictEqual(initSolBalc);

test("initial conditions", () => {
	acctIsNull(vaultAta1);
});

//------------------==
test("Make DragonCoin Mint, ATA, Tokens", () => {
	ll("\n------== Make DragonCoin Mint, ATA, Tokens");
	signerKp = adminKp;
	mintKp = dragonCoinKp;
	mintAuthorityKp = dgcAuthorityKp;
	decimals = decDgc;
	amt = initDgcBalc;

	signer = signerKp.publicKey;
	mint = mintKp.publicKey;
	mintAuthority = mintAuthorityKp.publicKey;
	ll("signer", signerKp.publicKey.toBase58());
	ll("mint", mint.toBase58());
	//TODO: Codama to defined optional account
	acctIsNull(mint);
	lgcInitMint(signerKp, mintKp, mintAuthority, mintAuthority, decimals);
	acctExists(mint);

	user = admin;
	ata = getAta(mint, user);
	lgcInitAta(signerKp, user, mint, ata);
	acctExists(ata);
	lgcMintToken(mintAuthorityKp, user, mint, ata, decimals, amt);
	ataBalCk(ata, amt, "admin", decDgc);
	ll("can mint to admin with ATA");

	user = user2;
	ata = getAta(mint, user);
	acctIsNull(ata);
	lgcMintToken(mintAuthorityKp, user, mint, ata, decimals, amt);
	ataBalCk(ata, amt, "user2", decDgc);
	ll("can mint to user2 without ATA");
});

test("Set USDT Mint and ATAs", () => {
	ll("\n------== Set USDT Mint and ATAs");
	setMint(usdcMint);
	acctExists(usdcMint);
	setMint(usdtMint);
	acctExists(usdtMint);
	setMint(pyusdMint);
	acctExists(pyusdMint);
	setMint(usdgMint);
	acctExists(usdgMint);

	setAtaCheck(usdcMint, admin, initUsdcBalc, "Admin USDC");
	setAtaCheck(usdcMint, user1, initUsdcBalc, "User1 USDC");
	setAtaCheck(usdcMint, user2, initUsdcBalc, "User2 USDC");
	setAtaCheck(usdcMint, user3, initUsdcBalc, "User3 USDC");
	setAtaCheck(usdcMint, hacker, initUsdcBalc, "Hacker USDC");
});

test("InitConfig", () => {
	ll("\n------== InitConfig");
	ll("vault1:", vault1.toBase58());
	ll(`configPDA: ${configPDA}`);
	signerKp = user1Kp;
	const mints = [usdcMint, usdtMint, pyusdMint, usdgMint];
	const progOwner = owner;
	const progAdmin = user1;
	const fee = 111000000n;
	const isAuthorized = true;
	const status = Status.Active;
	const str = "MoonDog to the Moon!";

	ll("progOwner:", progOwner.toBase58(), progOwner.toBytes());
	ll("progAdmin:", progAdmin.toBase58(), progAdmin.toBytes());
	initConfig(
		signerKp,
		mints,
		progOwner,
		progAdmin,
		isAuthorized,
		status,
		fee,
		str,
	);
});

test("Deposit Legacy Tokens", () => {
	ll("\n------== Deposit Legacy Tokens");
	signerKp = user1Kp;
	mint = usdcMint;
	decimals = 6;
	amt = as6zBn(370);

	signer = signerKp.publicKey;
	fromAta = getAta(mint, signer);
	vaultOut = findPdaV1(signer, "signerVault");
	toAta = getAta(mint, vaultOut.pda);

	lgcDeposit(
		signerKp,
		fromAta,
		toAta,
		vaultOut.pda, //vault as to_wallet
		mint,
		configPDA,
		decimals,
		amt,
	);
	ataBalCk(toAta, as6zBn(370), "vault1");
	ataBalCk(fromAta, as6zBn(630), "user1 ");
});
test("Withdraw Legacy Tokens", () => {
	ll("\n------== Withdraw Legacy Tokens");
	signerKp = user1Kp;
	mint = usdcMint;
	decimals = 6;
	amt = as6zBn(120);

	signer = signerKp.publicKey;
	toAta = getAta(mint, signer);
	vaultOut = findPdaV1(signer, "signerVault");
	fromAta = getAta(mint, vaultOut.pda);

	lgcWithdraw(signerKp, fromAta, toAta, vaultOut.pda, mint, decimals, amt);
	ataBalCk(fromAta, as6zBn(250), "vault1");
	ataBalCk(toAta, as6zBn(750), "user1 ");
});

test("Owner Deposits SOL to VaultPDA", () => {
	ll("\n------== Owner Deposits SOL to VaultPDA");
	ll("vaultO:", vaultO.toBase58());
	signerKp = ownerKp;
	const amtDeposit = as9zBn(0.46);
	balcBf = svm.getBalance(vaultO);
	ll("vaultO SOL:", balcBf);
	expect(balcAf).toBeUndefined();

	depositSol(signerKp, vaultO, amtDeposit);
	//sendSol(...) makes accounts, not PDA controlled by the
	balcAf = svm.getBalance(vaultO);
	ll("vaultO SOL:", balcAf);
	const vaultRent = 1002240n; //from Rust
	expect(balcAf).toStrictEqual(vaultRent + amtDeposit);
});

test("Pay Legacy Tokens", () => {
	ll("\n------== Pay Legacy Tokens");
	signerKp = user1Kp;
	mint = usdcMint;
	decimals = 6;
	amt = as6zBn(326);

	signer = signerKp.publicKey;
	fromAta = getAta(mint, signer);
	toAta = getAta(mint, vaultO);
	//TODO: this vaultO should be changed to an account from string seed

	lgcPay(signerKp, fromAta, toAta, vaultO, mint, configPDA, decimals, amt);
	ataBalCk(toAta, amt, "vaultO");
	ataBalCk(fromAta, as6zBn(424), "user1 ");
});
test("Redeem Legacy Tokens", () => {
	ll("\n------== Redeem Legacy Tokens");
	signerKp = user1Kp;
	mint = usdcMint;
	decimals = 6;
	amt = as6zBn(37);

	signer = signerKp.publicKey;
	toAta = getAta(mint, signer);
	vaultOut = findPdaV1(owner, "Vault");
	fromAta = getAta(mint, vaultOut.pda);

	lgcRedeem(
		signerKp,
		fromAta,
		toAta,
		vaultOut.pda,
		configPDA,
		mint,
		decimals,
		amt,
	);
	ataBalCk(fromAta, as6zBn(289), "vaultO");
	ataBalCk(toAta, as6zBn(461), "user1 ");
});

test.skip("copy accounts from devnet", async () => {
	//https://litesvm.github.io/litesvm/tutorial.html#copying-accounts-from-a-live-environment
	const connection = new Connection("https://api.devnet.solana.com");
	const AccountView = await connection.getAccountInfo(usdcMint);
	// the rent epoch goes above 2**53 which breaks web3.js, so just set it to 0;
	if (!AccountView) throw new Error("AccountView is null");
	AccountView.rentEpoch = 0;
	svm.setAccount(usdcMint, AccountView);
	const rawAccount = svm.getAccount(usdcMint);
	expect(rawAccount).not.toBeNull();
});
