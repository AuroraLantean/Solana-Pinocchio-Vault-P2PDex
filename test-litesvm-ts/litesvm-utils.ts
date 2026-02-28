import { expect } from "bun:test";
import {
	ACCOUNT_SIZE,
	AccountLayout,
	ASSOCIATED_TOKEN_PROGRAM_ID,
	getAssociatedTokenAddressSync,
	MINT_SIZE,
	MintLayout,
	TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
	type Keypair,
	LAMPORTS_PER_SOL,
	PublicKey,
	SYSVAR_INSTRUCTIONS_PUBKEY,
	SystemProgram,
	Transaction,
	TransactionInstruction,
} from "@solana/web3.js";
import {
	ComputeBudget,
	type FailedTransactionMetadata,
	LiteSVM,
	type SimulatedTransactionInfo,
	TransactionMetadata,
} from "litesvm";

import type { Status } from "./decoder";
import {
	boolToByte,
	checkBigint,
	checkDecimals,
	decodeHexstrToUint8,
	getTimeBig,
	numToBytes,
	statusToByte,
	strToU8Fixed,
	zero,
} from "./utils";
import {
	ATokenGPvbd,
	admin,
	dgcAuthority,
	futureOptionAddr,
	hacker,
	makeFakePricefeed,
	owner,
	type PriceFeed,
	RentSysvar,
	SYSTEM_PROGRAM,
	usdtMint,
	user1,
	user2,
	user3,
	vaultProgAddr,
} from "./web3jsSetup";

const ll = console.log;
ll("\n------== litesvm-utils");
export let svm = new LiteSVM();
export const initSolBalc = BigInt(LAMPORTS_PER_SOL) * BigInt(10);
ll("initialize accounts by airdropping SOLs");
svm.airdrop(owner, initSolBalc);
svm.airdrop(admin, initSolBalc);
svm.airdrop(user1, initSolBalc);
svm.airdrop(user2, initSolBalc);
svm.airdrop(user3, initSolBalc);
svm.airdrop(hacker, initSolBalc);
svm.airdrop(dgcAuthority, initSolBalc);

export type PdaOut = {
	pda: PublicKey;
	bump: number;
};
export const findPdaV1 = (
	userAddr: PublicKey,
	pdaName: string,
	seedStr = "vault",
	progAddr = vaultProgAddr,
): PdaOut => {
	const [pda, bump] = PublicKey.findProgramAddressSync(
		[Buffer.from(seedStr), userAddr.toBuffer()],
		progAddr,
	);
	ll(`${pdaName} pda: ${pda.toBase58()}, bump: ${bump}`);
	return { pda, bump };
};
export const configOut = findPdaV1(owner, "ConfigPDA", "config");
export const vaultOOut = findPdaV1(owner, "VaultO ");
export const vaultOut1 = findPdaV1(user1, "Vault1");
export const vaultOut2 = findPdaV1(user2, "Vault2");
export const vaultOut3 = findPdaV1(user3, "Vault3");
export const configPDA = configOut.pda;
export const configBump = configOut.bump;
export const vaultO = vaultOOut.pda;
export const vaultOBump = vaultOOut.bump;
export const vault1 = vaultOut1.pda;
export const vault2 = vaultOut2.pda;
export const vault3 = vaultOut3.pda;

export const findEscrow = (
	maker: PublicKey,
	id: bigint,
	progAddr = vaultProgAddr,
): PdaOut => {
	const [pda, bump] = PublicKey.findProgramAddressSync(
		[
			Buffer.from("escrow"),
			maker.toBuffer(),
			Buffer.copyBytesFrom(numToBytes(id)),
		],
		progAddr,
	);
	ll(`Escrow ${id}: ${pda.toBase58()}, bump: ${bump}`);
	return { pda, bump };
};

export const getSimpleAcct = (programId: PublicKey): PublicKey => {
	const [publickey, _bump] = PublicKey.findProgramAddressSync(
		[
			Buffer.from("future_option_simple_acct"),
			//user.toBuffer(),
			//opt_ctrt.toBuffer(),
		],
		programId,
	);
	ll("SimpleAcct:", publickey.toBase58());
	return publickey;
};
export const simpleAcctPbk = getSimpleAcct(futureOptionAddr);
export const simpleAcctPricefeed = makeFakePricefeed(simpleAcctPbk);

//-------------== Program Methods
export const initConfig = (
	signer: Keypair,
	mints: PublicKey[],
	progOwner: PublicKey,
	progAdmin: PublicKey,
	isAuthorized: boolean,
	status: Status,
	fee: bigint,
	str: string,
) => {
	const disc = 12;
	const argData = [
		boolToByte(isAuthorized),
		statusToByte(status),
		...numToBytes(fee),
		...strToU8Fixed(str),
	];
	if (mints.length < 4) throw new Error("mints length should be >= 4");
	if (mints[0] === undefined) throw new Error("mint0");
	if (mints[1] === undefined) throw new Error("mint1");
	if (mints[2] === undefined) throw new Error("mint2");
	if (mints[3] === undefined) throw new Error("mint3");
	//	if (mints.some(testMint)) { }
	// for (const mint of mints) {
	// 	if (mint === undefined) throw new Error("");
	// }

	const blockhash = svm.latestBlockhash();
	const ix = new TransactionInstruction({
		keys: [
			{ pubkey: signer.publicKey, isSigner: true, isWritable: true },
			{ pubkey: configPDA, isSigner: false, isWritable: true },
			{ pubkey: mints[0], isSigner: false, isWritable: false },
			{ pubkey: mints[1], isSigner: false, isWritable: false },
			{ pubkey: mints[2], isSigner: false, isWritable: false },
			{ pubkey: mints[3], isSigner: false, isWritable: false },
			{ pubkey: vaultO, isSigner: false, isWritable: false },
			{ pubkey: progOwner, isSigner: false, isWritable: false },
			{ pubkey: progAdmin, isSigner: false, isWritable: false },
			{ pubkey: SYSTEM_PROGRAM, isSigner: false, isWritable: false },
			{ pubkey: RentSysvar, isSigner: false, isWritable: false },
		],
		programId: vaultProgAddr,
		data: Buffer.from([disc, ...argData]),
	});
	sendTxns(svm, blockhash, [ix], [signer]);
};
export const updateConfig = (
	signer: Keypair,
	acct1: PublicKey,
	bytes4u8s: number[],
	numU32: number,
	numU64: bigint,
	//str: string,
) => {
	const disc = 13;
	const argData = [
		...bytes4u8s,
		...numToBytes(numU32, 32),
		...numToBytes(numU64, 64),
		//...strToU8Fixed(str),
	];
	ll("acct1:", acct1.toBase58());

	const blockhash = svm.latestBlockhash();
	const ix = new TransactionInstruction({
		keys: [
			{ pubkey: signer.publicKey, isSigner: true, isWritable: true },
			{ pubkey: configPDA, isSigner: false, isWritable: true },
			{ pubkey: acct1, isSigner: false, isWritable: false },
		],
		programId: vaultProgAddr,
		data: Buffer.from([disc, ...argData]),
	});
	sendTxns(svm, blockhash, [ix], [signer]);
};
export const configResize = (
	signer: Keypair,
	configPDA: PublicKey,
	newSize: bigint,
) => {
	const disc = 19;
	ll("configPDA:", configPDA.toBase58());
	ll("newSize:", newSize);
	const argData = [...numToBytes(newSize, 64)];
	const blockhash = svm.latestBlockhash();
	const ix = new TransactionInstruction({
		keys: [
			{ pubkey: signer.publicKey, isSigner: true, isWritable: true },
			{ pubkey: configPDA, isSigner: false, isWritable: true },
			{ pubkey: SYSTEM_PROGRAM, isSigner: false, isWritable: false },
			{ pubkey: RentSysvar, isSigner: false, isWritable: false },
		],
		programId: vaultProgAddr,
		data: Buffer.from([disc, ...argData]),
	});
	sendTxns(svm, blockhash, [ix], [signer]);
};
export const updateConfig2 = (
	signer: Keypair,
	bytes4bools: number[],
	bytes4u8s: number[],
	bytes4u32s: number[],
	bytes4u64s: number[],
	acct1: PublicKey,
	acct2: PublicKey,
	str: string,
) => {
	const disc = 20;
	const argData = [
		...bytes4bools,
		...bytes4u8s,
		...bytes4u32s,
		...bytes4u64s,
		...strToU8Fixed(str),
	];
	ll("acct1:", acct1.toBase58());
	ll("acct2:", acct2.toBase58());

	const blockhash = svm.latestBlockhash();
	const ix = new TransactionInstruction({
		keys: [
			{ pubkey: signer.publicKey, isSigner: true, isWritable: true },
			{ pubkey: configPDA, isSigner: false, isWritable: true },
			{ pubkey: acct1, isSigner: false, isWritable: false },
			{ pubkey: acct2, isSigner: false, isWritable: false },
		],
		programId: vaultProgAddr,
		data: Buffer.from([disc, ...argData]),
	});
	sendTxns(svm, blockhash, [ix], [signer]);
};
export const closeConfig = (
	signer: Keypair,
	configPDA: PublicKey,
	dest: PublicKey,
) => {
	const disc = 14;
	ll("configPDA:", configPDA.toBase58());
	ll("dest:", dest.toBase58());

	const blockhash = svm.latestBlockhash();
	const ix = new TransactionInstruction({
		keys: [
			{ pubkey: signer.publicKey, isSigner: true, isWritable: true },
			{ pubkey: configPDA, isSigner: false, isWritable: true },
			{ pubkey: dest, isSigner: false, isWritable: false },
		],
		programId: vaultProgAddr,
		data: Buffer.from([disc]),
	});
	sendTxns(svm, blockhash, [ix], [signer]);
};

export const depositSol = (
	signer: Keypair,
	userVault: PublicKey,
	amount: bigint,
) => {
	const disc = 0;
	const argData = numToBytes(amount);
	const blockhash = svm.latestBlockhash();
	const ix = new TransactionInstruction({
		keys: [
			{ pubkey: signer.publicKey, isSigner: true, isWritable: true },
			{ pubkey: userVault, isSigner: false, isWritable: true },
			{ pubkey: SYSTEM_PROGRAM, isSigner: false, isWritable: false },
			{ pubkey: RentSysvar, isSigner: false, isWritable: false },
		],
		programId: vaultProgAddr,
		data: Buffer.from([disc, ...argData]),
	});
	sendTxns(svm, blockhash, [ix], [signer]);
};
export const withdrawSol = (
	signer: Keypair,
	vaultPdaX: PublicKey,
	amount: bigint,
	expectedError = "",
) => {
	const disc = 1;
	const argData = numToBytes(amount);
	const blockhash = svm.latestBlockhash();
	const ix = new TransactionInstruction({
		keys: [
			{ pubkey: signer.publicKey, isSigner: true, isWritable: true },
			{ pubkey: vaultPdaX, isSigner: false, isWritable: true },
			{ pubkey: RentSysvar, isSigner: false, isWritable: false },
		],
		programId: vaultProgAddr,
		data: Buffer.from([disc, ...argData]),
	});
	sendTxns(svm, blockhash, [ix], [signer], expectedError);
};
export const lgcInitMint = (
	signer: Keypair,
	mintKp: Keypair,
	mintAuthority: PublicKey,
	freezeAuthorityOpt: PublicKey,
	decimals: number,
	//argData: Uint8Array<ArrayBufferLike>,
	tokenProg = TOKEN_PROGRAM_ID,
) => {
	const disc = 2;
	checkDecimals(decimals);
	const blockhash = svm.latestBlockhash();
	const ix = new TransactionInstruction({
		keys: [
			{ pubkey: signer.publicKey, isSigner: true, isWritable: true },
			{ pubkey: mintKp.publicKey, isSigner: true, isWritable: true },
			{ pubkey: mintAuthority, isSigner: false, isWritable: false },
			{ pubkey: tokenProg, isSigner: false, isWritable: false },
			{ pubkey: freezeAuthorityOpt, isSigner: false, isWritable: false },
			{ pubkey: SYSTEM_PROGRAM, isSigner: false, isWritable: false },
			{ pubkey: RentSysvar, isSigner: false, isWritable: false },
		],
		programId: vaultProgAddr,
		data: Buffer.from([disc, decimals]),
	});
	sendTxns(svm, blockhash, [ix], [signer, mintKp]);
};
export const tok22InitMint = (
	signer: Keypair,
	mintKp: Keypair,
	mintAuthority: PublicKey,
	freezeAuthorityOpt: PublicKey,
	decimals: number,
	//argData: Uint8Array<ArrayBufferLike>,
	tokenProg = TOKEN_PROGRAM_ID,
) => {
	const disc = 2;
	checkDecimals(decimals);
	const blockhash = svm.latestBlockhash();
	const ix = new TransactionInstruction({
		keys: [
			{ pubkey: signer.publicKey, isSigner: true, isWritable: true },
			{ pubkey: mintKp.publicKey, isSigner: true, isWritable: true },
			{ pubkey: mintAuthority, isSigner: false, isWritable: false },
			{ pubkey: tokenProg, isSigner: false, isWritable: false },
			{ pubkey: freezeAuthorityOpt, isSigner: false, isWritable: false },
			{ pubkey: SYSTEM_PROGRAM, isSigner: false, isWritable: false },
			{ pubkey: RentSysvar, isSigner: false, isWritable: false },
		],
		programId: vaultProgAddr,
		data: Buffer.from([disc, decimals]),
	});
	sendTxns(svm, blockhash, [ix], [signer, mintKp]);
};
export const lgcInitAta = (
	signer: Keypair,
	toWallet: PublicKey,
	mint: PublicKey,
	ata: PublicKey,
	tokenProg = TOKEN_PROGRAM_ID,
	atokenProg = ATokenGPvbd,
) => {
	const disc = 3;
	const blockhash = svm.latestBlockhash();
	const ix = new TransactionInstruction({
		keys: [
			{ pubkey: signer.publicKey, isSigner: true, isWritable: true },
			{ pubkey: toWallet, isSigner: false, isWritable: false },
			{ pubkey: mint, isSigner: false, isWritable: false },
			{ pubkey: ata, isSigner: false, isWritable: true },
			{ pubkey: tokenProg, isSigner: false, isWritable: false },
			{ pubkey: SYSTEM_PROGRAM, isSigner: false, isWritable: false },
			{ pubkey: atokenProg, isSigner: false, isWritable: false },
			{ pubkey: RentSysvar, isSigner: false, isWritable: false },
		],
		programId: vaultProgAddr,
		data: Buffer.from([disc]),
	});
	sendTxns(svm, blockhash, [ix], [signer]);
};
export const lgcMintToken = (
	mintAuthority: Keypair,
	toWallet: PublicKey,
	mint: PublicKey,
	ata: PublicKey,
	decimals: number,
	amount: bigint,
	tokenProg = TOKEN_PROGRAM_ID,
	atokenProg = ATokenGPvbd,
) => {
	const disc = 4;
	checkDecimals(decimals);
	checkBigint(amount, "amount");
	const argData = [decimals, ...numToBytes(amount)];
	const blockhash = svm.latestBlockhash();
	const ix = new TransactionInstruction({
		keys: [
			{ pubkey: mintAuthority.publicKey, isSigner: true, isWritable: true },
			{ pubkey: toWallet, isSigner: false, isWritable: false },
			{ pubkey: mint, isSigner: false, isWritable: true },
			{ pubkey: ata, isSigner: false, isWritable: true },
			{ pubkey: tokenProg, isSigner: false, isWritable: false },
			{ pubkey: SYSTEM_PROGRAM, isSigner: false, isWritable: false },
			{ pubkey: atokenProg, isSigner: false, isWritable: false },
			{ pubkey: RentSysvar, isSigner: false, isWritable: false },
		],
		programId: vaultProgAddr,
		data: Buffer.from([disc, ...argData]),
	});
	sendTxns(svm, blockhash, [ix], [mintAuthority]);
};

export const lgcDeposit = (
	userSigner: Keypair,
	fromAta: PublicKey,
	toAta: PublicKey,
	userVault: PublicKey,
	mint: PublicKey,
	configPda: PublicKey,
	decimals: number,
	amount: bigint,
	tokenProg = TOKEN_PROGRAM_ID,
	atokenProg = ATokenGPvbd,
) => {
	const disc = 5;
	checkDecimals(decimals);
	checkBigint(amount, "amount");
	const argData = [decimals, ...numToBytes(amount)];
	const blockhash = svm.latestBlockhash();
	const ix = new TransactionInstruction({
		keys: [
			{ pubkey: userSigner.publicKey, isSigner: true, isWritable: true },
			{ pubkey: fromAta, isSigner: false, isWritable: true },
			{ pubkey: toAta, isSigner: false, isWritable: true },
			{ pubkey: userVault, isSigner: false, isWritable: true }, // true
			{ pubkey: mint, isSigner: false, isWritable: false },
			{ pubkey: configPda, isSigner: false, isWritable: true },
			{ pubkey: tokenProg, isSigner: false, isWritable: false },
			{ pubkey: SYSTEM_PROGRAM, isSigner: false, isWritable: false },
			{ pubkey: atokenProg, isSigner: false, isWritable: false },
			{ pubkey: RentSysvar, isSigner: false, isWritable: false },
		],
		programId: vaultProgAddr,
		data: Buffer.from([disc, ...argData]),
	});
	sendTxns(svm, blockhash, [ix], [userSigner]);
};
export const lgcWithdraw = (
	userSigner: Keypair,
	fromAta: PublicKey,
	toAta: PublicKey,
	userVault: PublicKey,
	mint: PublicKey,
	decimals: number,
	amount: bigint,
	tokenProg = TOKEN_PROGRAM_ID,
	atokenProg = ATokenGPvbd,
) => {
	const disc = 6;
	checkDecimals(decimals);
	checkBigint(amount, "amount");
	const argData = [decimals, ...numToBytes(amount)];
	const blockhash = svm.latestBlockhash();
	const ix = new TransactionInstruction({
		keys: [
			{ pubkey: userSigner.publicKey, isSigner: true, isWritable: true },
			{ pubkey: fromAta, isSigner: false, isWritable: true },
			{ pubkey: toAta, isSigner: false, isWritable: true },
			{ pubkey: userVault, isSigner: false, isWritable: false },
			{ pubkey: mint, isSigner: false, isWritable: false },
			{ pubkey: tokenProg, isSigner: false, isWritable: false },
			{ pubkey: SYSTEM_PROGRAM, isSigner: false, isWritable: false },
			{ pubkey: atokenProg, isSigner: false, isWritable: false },
			{ pubkey: RentSysvar, isSigner: false, isWritable: false },
		],
		programId: vaultProgAddr,
		data: Buffer.from([disc, ...argData]),
	});
	sendTxns(svm, blockhash, [ix], [userSigner]);
};
export const lgcPay = (
	userSigner: Keypair,
	fromAta: PublicKey,
	toAta: PublicKey,
	centralVault: PublicKey,
	mint: PublicKey,
	configPda: PublicKey,
	decimals: number,
	amount: bigint,
	tokenProg = TOKEN_PROGRAM_ID,
	atokenProg = ATokenGPvbd,
) => {
	const disc = 7;
	checkDecimals(decimals);
	checkBigint(amount, "amount");
	const argData = [decimals, ...numToBytes(amount)];
	const blockhash = svm.latestBlockhash();
	const ix = new TransactionInstruction({
		keys: [
			{ pubkey: userSigner.publicKey, isSigner: true, isWritable: true },
			{ pubkey: fromAta, isSigner: false, isWritable: true },
			{ pubkey: toAta, isSigner: false, isWritable: true },
			{ pubkey: centralVault, isSigner: false, isWritable: true }, // true
			{ pubkey: mint, isSigner: false, isWritable: false },
			{ pubkey: configPda, isSigner: false, isWritable: true },
			{ pubkey: tokenProg, isSigner: false, isWritable: false },
			{ pubkey: SYSTEM_PROGRAM, isSigner: false, isWritable: false },
			{ pubkey: atokenProg, isSigner: false, isWritable: false },
			{ pubkey: RentSysvar, isSigner: false, isWritable: false },
		],
		programId: vaultProgAddr,
		data: Buffer.from([disc, ...argData]),
	});
	sendTxns(svm, blockhash, [ix], [userSigner]);
};
export const lgcRedeem = (
	userSigner: Keypair,
	fromAta: PublicKey,
	toAta: PublicKey,
	centralVault: PublicKey,
	configPDA: PublicKey,
	mint: PublicKey,
	decimals: number,
	amount: bigint,
	tokenProg = TOKEN_PROGRAM_ID,
	atokenProg = ATokenGPvbd,
) => {
	const disc = 8;
	checkDecimals(decimals);
	checkBigint(amount, "amount");
	const argData = [decimals, ...numToBytes(amount)];
	const blockhash = svm.latestBlockhash();
	const ix = new TransactionInstruction({
		keys: [
			{ pubkey: userSigner.publicKey, isSigner: true, isWritable: true },
			{ pubkey: fromAta, isSigner: false, isWritable: true },
			{ pubkey: toAta, isSigner: false, isWritable: true },
			{ pubkey: centralVault, isSigner: false, isWritable: false },
			{ pubkey: configPDA, isSigner: false, isWritable: false },
			{ pubkey: mint, isSigner: false, isWritable: false },
			{ pubkey: tokenProg, isSigner: false, isWritable: false },
			{ pubkey: SYSTEM_PROGRAM, isSigner: false, isWritable: false },
			{ pubkey: atokenProg, isSigner: false, isWritable: false },
			{ pubkey: RentSysvar, isSigner: false, isWritable: false },
		],
		programId: vaultProgAddr,
		data: Buffer.from([disc, ...argData]),
	});
	sendTxns(svm, blockhash, [ix], [userSigner]);
};
export const makeTokEscrow = (
	maker: Keypair,
	makerAtaX: PublicKey,
	escrowAtaX: PublicKey,
	mintX: PublicKey,
	mintY: PublicKey,
	escrowPDA: PublicKey,
	configPDA: PublicKey,
	decimalX: number,
	amountX: bigint,
	decimalY: number,
	amountY: bigint,
	id: bigint,
	tokenProg = TOKEN_PROGRAM_ID,
	atokenProg = ATokenGPvbd,
) => {
	const disc = 15;
	checkDecimals(decimalX, "decimalX");
	checkDecimals(decimalX, "decimalY");
	checkBigint(amountX, "amountX");
	checkBigint(amountY, "amountY");
	checkBigint(id, "id");
	const argData = [
		decimalX,
		...numToBytes(amountX),
		decimalY,
		...numToBytes(amountY),
		...numToBytes(id),
	];
	const blockhash = svm.latestBlockhash();
	const ix = new TransactionInstruction({
		keys: [
			{ pubkey: maker.publicKey, isSigner: true, isWritable: true },
			{ pubkey: makerAtaX, isSigner: false, isWritable: true },
			{ pubkey: escrowAtaX, isSigner: false, isWritable: true },
			{ pubkey: mintX, isSigner: false, isWritable: false },
			{ pubkey: mintY, isSigner: false, isWritable: false },
			{ pubkey: escrowPDA, isSigner: false, isWritable: true },
			{ pubkey: configPDA, isSigner: false, isWritable: true },
			{ pubkey: tokenProg, isSigner: false, isWritable: false },
			{ pubkey: SYSTEM_PROGRAM, isSigner: false, isWritable: false },
			{ pubkey: atokenProg, isSigner: false, isWritable: false },
			{ pubkey: RentSysvar, isSigner: false, isWritable: false },
		],
		programId: vaultProgAddr,
		data: Buffer.from([disc, ...argData]),
	});
	sendTxns(svm, blockhash, [ix], [maker]);
};
export const takeTokEscrow = (
	taker: Keypair,
	takerAtaX: PublicKey,
	takerAtaY: PublicKey,
	escrowAtaX: PublicKey,
	escrowAtaY: PublicKey,
	mintX: PublicKey,
	mintY: PublicKey,
	escrowPDA: PublicKey,
	configPDA: PublicKey,
	decimalX: number,
	amountX: bigint,
	decimalY: number,
	amountY: bigint,
	id: bigint,
	tokenProg = TOKEN_PROGRAM_ID,
	atokenProg = ATokenGPvbd,
) => {
	const disc = 16;
	checkDecimals(decimalX, "decimalX");
	checkDecimals(decimalX, "decimalY");
	checkBigint(amountX, "amountX");
	checkBigint(amountY, "amountY");
	checkBigint(id, "id");
	const argData = [
		decimalX,
		...numToBytes(amountX),
		decimalY,
		...numToBytes(amountY),
		...numToBytes(id),
	];
	const blockhash = svm.latestBlockhash();
	const ix = new TransactionInstruction({
		keys: [
			{ pubkey: taker.publicKey, isSigner: true, isWritable: true },
			{ pubkey: takerAtaX, isSigner: false, isWritable: true },
			{ pubkey: takerAtaY, isSigner: false, isWritable: true },
			{ pubkey: escrowAtaX, isSigner: false, isWritable: true },
			{ pubkey: escrowAtaY, isSigner: false, isWritable: true },
			{ pubkey: mintX, isSigner: false, isWritable: false },
			{ pubkey: mintY, isSigner: false, isWritable: false },
			{ pubkey: escrowPDA, isSigner: false, isWritable: true },
			{ pubkey: configPDA, isSigner: false, isWritable: true },
			{ pubkey: tokenProg, isSigner: false, isWritable: false },
			{ pubkey: SYSTEM_PROGRAM, isSigner: false, isWritable: false },
			{ pubkey: atokenProg, isSigner: false, isWritable: false },
			{ pubkey: RentSysvar, isSigner: false, isWritable: false },
		],
		programId: vaultProgAddr,
		data: Buffer.from([disc, ...argData]),
	});
	sendTxns(svm, blockhash, [ix], [taker]);
};
export const withdrawTokEscrow = (
	maker: Keypair,
	makerAtaX: PublicKey,
	makerAtaY: PublicKey,
	escrowAtaX: PublicKey,
	escrowAtaY: PublicKey,
	mintX: PublicKey,
	mintY: PublicKey,
	escrowPDA: PublicKey,
	configPDA: PublicKey,
	tokenProg = TOKEN_PROGRAM_ID,
	atokenProg = ATokenGPvbd,
) => {
	const disc = 17;
	const blockhash = svm.latestBlockhash();
	const ix = new TransactionInstruction({
		keys: [
			{ pubkey: maker.publicKey, isSigner: true, isWritable: true },
			{ pubkey: makerAtaX, isSigner: false, isWritable: true },
			{ pubkey: makerAtaY, isSigner: false, isWritable: true },
			{ pubkey: escrowAtaX, isSigner: false, isWritable: true },
			{ pubkey: escrowAtaY, isSigner: false, isWritable: true },
			{ pubkey: mintX, isSigner: false, isWritable: false },
			{ pubkey: mintY, isSigner: false, isWritable: false },
			{ pubkey: escrowPDA, isSigner: false, isWritable: true },
			{ pubkey: configPDA, isSigner: false, isWritable: true },
			{ pubkey: tokenProg, isSigner: false, isWritable: false },
			{ pubkey: SYSTEM_PROGRAM, isSigner: false, isWritable: false },
			{ pubkey: atokenProg, isSigner: false, isWritable: false },
			{ pubkey: RentSysvar, isSigner: false, isWritable: false },
		],
		programId: vaultProgAddr,
		data: Buffer.from([disc]),
	});
	sendTxns(svm, blockhash, [ix], [maker]);
};
export const cancelTokEscrow = (
	makerSigner: Keypair,
	makerAtaX: PublicKey,
	makerAtaY: PublicKey,
	escrowAtaX: PublicKey,
	escrowAtaY: PublicKey,
	mintX: PublicKey,
	mintY: PublicKey,
	escrowPDA: PublicKey,
	configPDA: PublicKey,
	tokenProg = TOKEN_PROGRAM_ID,
	atokenProg = ATokenGPvbd,
) => {
	const disc = 18;
	const blockhash = svm.latestBlockhash();
	const ix = new TransactionInstruction({
		keys: [
			{ pubkey: makerSigner.publicKey, isSigner: true, isWritable: true },
			{ pubkey: makerAtaX, isSigner: false, isWritable: true },
			{ pubkey: makerAtaY, isSigner: false, isWritable: true },
			{ pubkey: escrowAtaX, isSigner: false, isWritable: true },
			{ pubkey: escrowAtaY, isSigner: false, isWritable: true },
			{ pubkey: mintX, isSigner: false, isWritable: false },
			{ pubkey: mintY, isSigner: false, isWritable: false },
			{ pubkey: escrowPDA, isSigner: false, isWritable: true },
			{ pubkey: configPDA, isSigner: false, isWritable: true },
			{ pubkey: tokenProg, isSigner: false, isWritable: false },
			{ pubkey: SYSTEM_PROGRAM, isSigner: false, isWritable: false },
			{ pubkey: atokenProg, isSigner: false, isWritable: false },
			{ pubkey: RentSysvar, isSigner: false, isWritable: false },
		],
		programId: vaultProgAddr,
		data: Buffer.from([disc]),
	});
	sendTxns(svm, blockhash, [ix], [makerSigner]);
};

export const oraclesRead = (
	signer: Keypair,
	configPDA: PublicKey,
	tokenMint: PublicKey,
	tokenProg: PublicKey,
	writeAuthority: PublicKey,
	pricefeed: PriceFeed,
	num_u64: bigint,
) => {
	const disc = 21;
	if (pricefeed.vendor > 255) throw new Error("oracleVendor > 255");
	const argData = [
		pricefeed.vendor,
		0,
		0,
		0,
		...numToBytes(num_u64, 64),
		...decodeHexstrToUint8(pricefeed.feedId),
	];
	ll("configPDA:", configPDA.toBase58());
	ll("oraclePDA:", pricefeed.addr.toBase58());

	const blockhash = svm.latestBlockhash();
	const ix = new TransactionInstruction({
		keys: [
			{ pubkey: signer.publicKey, isSigner: true, isWritable: true },
			{ pubkey: configPDA, isSigner: false, isWritable: true },
			{ pubkey: pricefeed.addr, isSigner: false, isWritable: false },
			{ pubkey: tokenMint, isSigner: false, isWritable: false },
			{ pubkey: tokenProg, isSigner: false, isWritable: false },
			{ pubkey: writeAuthority, isSigner: false, isWritable: false },
		],
		programId: vaultProgAddr,
		data: Buffer.from([disc, ...argData]),
	});
	sendTxns(svm, blockhash, [ix], [signer]);
};

//-------------== LiteSVM System Methods
export const sendSol = (signer: Keypair, addrTo: PublicKey, amount: bigint) => {
	const blockhash = svm.latestBlockhash();
	const ixs = [
		SystemProgram.transfer({
			fromPubkey: signer.publicKey,
			toPubkey: addrTo,
			lamports: amount,
		}),
	];
	sendTxns(svm, blockhash, ixs, [signer], "", SYSTEM_PROGRAM);
};

export const makeAccount = (
	signer: Keypair,
	newAccount: PublicKey,
	programId: PublicKey,
) => {
	const blockhash = svm.latestBlockhash();
	const ixs = [
		SystemProgram.createAccount({
			fromPubkey: signer.publicKey,
			newAccountPubkey: newAccount,
			lamports: Number(svm.minimumBalanceForRentExemption(BigInt(4))),
			space: 4,
			programId: programId,
		}),
	];
	sendTxns(svm, blockhash, ixs, [signer], "", SYSTEM_PROGRAM);
};
//const rawAccount = svm.getAccount(address);

//When you want to make Mint without the Mint Keypair. E.g. UsdtMintKp;
//https://solana.com/docs/tokens/basics/create-mint
export const setMint = (
	mint: PublicKey,
	decimals = 6,
	supply = 9_000_000_000_000n,
	mintAuthority = owner,
	freezeAuthority = owner,
	programId = TOKEN_PROGRAM_ID,
) => {
	const rawMintAcctData = Buffer.alloc(MINT_SIZE);
	MintLayout.encode(
		{
			mintAuthorityOption: 1, //0,
			mintAuthority: mintAuthority, // PublicKey.default,
			supply: supply, // 0n
			decimals: decimals, //0
			isInitialized: true, //false,
			freezeAuthorityOption: 1, //0,
			freezeAuthority: freezeAuthority, // PublicKey.default,
		},
		rawMintAcctData,
	);
	svm.setAccount(mint, {
		lamports: 1_000_000_000,
		data: rawMintAcctData,
		owner: programId,
		executable: false,
	});
};

//---------------==
export const setPriceFeedPda = (pricefeed: PriceFeed) => {
	//const file = Bun.file(path);
	// await file.json();
	ll("addr:", pricefeed.addr.toBase58());
	ll("jsonData:", pricefeed.json);
	const account = pricefeed.json.account;

	if (account.data.length < 2)
		throw new Error("account data should have length 2");
	// biome-ignore lint/style/noNonNullAssertion: <>
	const data = Uint8Array.fromBase64(account.data[0]!);
	ll("data:", data);
	ll("lamports:", account.lamports);
	svm.setAccount(pricefeed.addr, {
		lamports: account.lamports,
		data,
		owner: new PublicKey(account.owner),
		executable: account.executable,
		//rentEpoch: account.rentEpoch,
	});
};
//-------------== USDC or USDT
export const acctIsNull = (account: PublicKey) => {
	const raw = svm.getAccount(account);
	expect(raw).toBeNull();
};
export const acctExists = (account: PublicKey) => {
	const raw = svm.getAccount(account);
	expect(raw).not.toBeNull();
};
export const getAta = (
	mint: PublicKey,
	owner: PublicKey,
	allowOwnerOffCurve = true,
	programId = TOKEN_PROGRAM_ID,
	associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID,
) => {
	const ata = getAssociatedTokenAddressSync(
		mint,
		owner,
		allowOwnerOffCurve,
		programId,
		associatedTokenProgramId,
	);
	return ata;
};
export const vaultAtaO = getAta(usdtMint, vaultO);
export const vaultAta1 = getAta(usdtMint, vault1);
export const vaultAta2 = getAta(usdtMint, vault2);
export const vaultAta3 = getAta(usdtMint, vault3);

//Test with arbitrary accounts: https://litesvm.github.io/litesvm/tutorial.html#time-travel
export const setAta = (
	mint: PublicKey,
	owner: PublicKey,
	tokenAmount: bigint,
	allowOwnerOffCurve = true,
	programId = TOKEN_PROGRAM_ID,
	associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID,
) => {
	const ata = getAssociatedTokenAddressSync(
		mint,
		owner,
		allowOwnerOffCurve,
		programId,
		associatedTokenProgramId,
	);

	/* Set account via knowing its layout
  export interface RawAccount {
    mint: PublicKey;
    owner: PublicKey;
    amount: bigint;
    delegateOption: 1 | 0;
    delegate: PublicKey;
    state: AccountState;
    isNativeOption: 1 | 0;
    isNative: bigint;
    delegatedAmount: bigint;
    closeAuthorityOption: 1 | 0;
    closeAuthority: PublicKey;
}

// Buffer layout for de/serializing a token account
export const AccountLayout = struct<RawAccount>([
    publicKey('mint'),
    publicKey('owner'),
    u64('amount'),
    u32('delegateOption'),
    publicKey('delegate'),
    u8('state'),
    u32('isNativeOption'),
    u64('isNative'),
    u64('delegatedAmount'),
    u32('closeAuthorityOption'),
    publicKey('closeAuthority'),
]);

// Byte length of a token account 
export const ACCOUNT_SIZE = AccountLayout.span; */
	const rawTokenAcctData = Buffer.alloc(ACCOUNT_SIZE);
	AccountLayout.encode(
		{
			mint,
			owner,
			amount: tokenAmount,
			delegateOption: 0,
			delegate: PublicKey.default,
			delegatedAmount: 0n,
			state: 1,
			isNativeOption: 0,
			isNative: 0n,
			closeAuthorityOption: 0,
			closeAuthority: PublicKey.default,
		},
		rawTokenAcctData,
	);
	svm.setAccount(ata, {
		lamports: 1_000_000_000,
		data: rawTokenAcctData,
		owner: programId,
		executable: false,
	});
	const raw = svm.getAccount(ata);
	return { raw, ata };
};
export const tokBalc = (
	mint: PublicKey,
	owner: PublicKey,
	programId = TOKEN_PROGRAM_ID,
	associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID,
) => {
	const ata = getAssociatedTokenAddressSync(
		mint,
		owner,
		true, //allowOwnerOffCurve?
		programId,
		associatedTokenProgramId,
	);
	const raw = svm.getAccount(ata);
	if (!raw) throw new Error("Ata is null");
	const rawAcctData = raw?.data;
	const decoded = AccountLayout.decode(rawAcctData);
	return decoded.amount;
};
export const ataBalc = (
	ata: PublicKey,
	name = "token balc",
	isVerbose = true,
) => {
	const raw = svm.getAccount(ata);
	if (!raw) {
		if (isVerbose) ll(name, ": ata is null");
		return zero;
	}
	const rawAcctData = raw?.data;
	const decoded = AccountLayout.decode(rawAcctData);
	if (isVerbose) ll(name, ":", decoded.amount);
	return decoded.amount;
};
export const ataBalCk = (
	ata: PublicKey,
	expectedAmount: bigint,
	name: string,
	decimals = 6,
) => {
	const amount = ataBalc(ata, name, false);
	ll(name, "token:", amount, amount / BigInt(10 ** decimals));
	expect(amount).toStrictEqual(expectedAmount);
};
export const setAtaCheck = (
	mint: PublicKey,
	user: PublicKey,
	amt: bigint,
	user_and_mint: string,
) => {
	const { raw: rawData, ata } = setAta(mint, user, amt);
	ll(user_and_mint, "ata:", ata.toBase58());
	expect(rawData).not.toBeNull();
	const rawAcctData = rawData?.data;
	if (rawAcctData) {
		const decoded = AccountLayout.decode(rawAcctData);
		ll(user_and_mint, "balc:", decoded.amount);
		expect(decoded.amount).toStrictEqual(amt);
	} else {
		ll(user_and_mint, "rawAcctData is undefined");
	}
};
//---------------== Deployment
export const deployVaultProgram = (computeMaxUnits?: bigint) => {
	ll("load deployVaultProgram...");
	if (computeMaxUnits) {
		const computeBudget = new ComputeBudget();
		computeBudget.computeUnitLimit = computeMaxUnits;
		svm = svm.withComputeBudget(computeBudget);
	}
	const programPath = "target/deploy/pinocchio_vault_escrow.so";
	//# Dump a program from mainnet
	//solana program dump progAddr pyth.so --url mainnet-beta

	svm.addProgramFromFile(vaultProgAddr, programPath);
	//return [programId];
};
deployVaultProgram();
ll("deployVaultProgram() is successful");
acctExists(vaultProgAddr);

export const deployAnchorProgram = (computeMaxUnits?: bigint) => {
	ll("deployProgram...");
	if (computeMaxUnits) {
		const computeBudget = new ComputeBudget();
		computeBudget.computeUnitLimit = computeMaxUnits;
		svm = svm.withComputeBudget(computeBudget);
	}
	const programPath = "program_bytes/future_option_market.so";
	//# Dump a program from mainnet
	//solana program dump progAddr pyth.so --url mainnet-beta
	svm.addProgramFromFile(futureOptionAddr, programPath);
	//return [programId];
};
deployAnchorProgram();
acctExists(futureOptionAddr);
ll("deployAnchorProgram() is successful");

/*pub struct InitSimpleAccount<'info> {
  #[account(
        init,
        payer = signer,
        space = 8 + 40,//SimpleAcct::INIT_SPACE,
        seeds = [SIMPLEACCT],
        bump
    )]
  pub simple_acct: Account<'info, SimpleAcct>,
  #[account(mut)]
  pub signer: Signer<'info>,
  pub system_program: Program<'info, System>,
} */
export const initSimpleAcct = (
	signer: Keypair,
	simpleAcctPDA: PublicKey,
	price: bigint,
) => {
	const disc = Uint8Array.from([70, 220, 86, 48, 234, 178, 26, 125]); //copied from Anchor IDL
	const argData = [...numToBytes(price)];

	const blockhash = svm.latestBlockhash();
	const ix = new TransactionInstruction({
		keys: [
			{ pubkey: simpleAcctPDA, isSigner: false, isWritable: true },
			{ pubkey: signer.publicKey, isSigner: true, isWritable: true },
			{ pubkey: SYSTEM_PROGRAM, isSigner: false, isWritable: false },
		],
		programId: futureOptionAddr,
		data: Buffer.from([...disc, ...argData]),
	});
	sendTxns(svm, blockhash, [ix], [signer], "", futureOptionAddr);
};

//---------------== Run Test
export const sendTxns = (
	svm: LiteSVM,
	blockhash: string,
	ixs: TransactionInstruction[],
	signerKps: Keypair[],
	expectedError = "",
	programId = vaultProgAddr,
) => {
	const tx = new Transaction();
	tx.recentBlockhash = blockhash;
	tx.add(...ixs);
	tx.sign(...signerKps); //first signature is considered "primary" and is used identify and confirm transactions.
	const simRes = svm.simulateTransaction(tx);
	const sendRes = svm.sendTransaction(tx);
	checkLogs(simRes, sendRes, programId, expectedError);
};
export const checkLogs = (
	simRes: FailedTransactionMetadata | SimulatedTransactionInfo,
	sendRes: TransactionMetadata | FailedTransactionMetadata,
	programId: PublicKey,
	expectedError = "",
	isVerbose = false,
) => {
	ll("\nsimRes meta prettylogs:", simRes.meta().prettyLogs());
	if (isVerbose) {
		ll("\nsimRes.meta().logs():", simRes.meta().logs());
	}
	/** simRes.meta():
      computeUnitsConsumed: [class computeUnitsConsumed],
      innerInstructions: [class innerInstructions],
      logs: [class logs],
      prettyLogs: [class prettyLogs],
      returnData: [class returnData],
      signature: [class signature],
      toString: [class toString], */
	if (sendRes instanceof TransactionMetadata) {
		expect(simRes.meta().logs()).toStrictEqual(sendRes.logs());

		const logLength = simRes.meta().logs().length;
		//ll("logLength:", logLength);
		//ll("sendRes.logs()[logIndex]:", sendRes.logs()[logIndex]);
		expect(sendRes.logs()[logLength - 1]).toStrictEqual(
			`Program ${programId} success`,
		);
	} else {
		ll("sendRes.err():", sendRes.err());
		ll("sendRes.meta():", sendRes.meta());
		const errStr = sendRes.toString();
		ll("sendRes.toString():", errStr);
		const pos = errStr.search("custom program error: 0x");
		ll("pos:", pos);
		if (pos > -1) {
			let errCode = errStr.substring(pos + 22, pos + 26);
			if (errCode.slice(-1) === '"') {
				//ll("last char:", errCode.slice(-1));
				errCode = errCode.slice(0, -1);
			}
			ll("error code:", errCode, Number(errCode));
		}
		ll(
			"find error here: https://docs.rs/solana-sdk/latest/solana_sdk/transaction/enum.TransactionError.html",
		);
		if (expectedError) {
			const foundErrorMesg = sendRes
				.toString()
				.includes(`custom program error: ${expectedError}`);
			ll("found error?:", foundErrorMesg);
			expect(foundErrorMesg).toEqual(true);
		} else {
			throw new Error("This error is unexpected");
		}
	}
};
/*export const setAta22 = (
	mint: PublicKey,
	owner: PublicKey,
	tokenAmount: bigint,
	allowOwnerOffCurve = true,
	programId = TOKEN_PROGRAM_ID,
	associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID,
) => {
	const ata = getAssociatedTokenAddressSync(
		mint,
		owner,
		allowOwnerOffCurve,
		programId,
		associatedTokenProgramId,
	);

	const rawToken2022AcctData = Buffer.alloc(AccountLayout2022);
	ACCOUNT_SIZE2022.encode(
		{
			mint,
			owner,
			amount: tokenAmount,
			delegateFlag: 0,
			delegate: PublicKey.default,
			delegatedAmount: 0n,
			state: 1,
			isNative: 0,
			isNativeAmount: 0n,
			closeAuthorityFlag: 0,
			closeAuthority: PublicKey.default,
		},
		rawToken2022AcctData,
	);
	svm.setAccount(ata, {
		lamports: 1_000_000_000,
		data: rawToken2022AcctData,
		owner: programId,
		executable: false,
	});
	const raw = svm.getAccount(ata);
	return { raw, ata };
};*/
export const setTime = (svm: LiteSVM) => {
	const time = getTimeBig();
	const clock = svm.getClock();
	clock.unixTimestamp = time;
	svm.setClock(clock);
};
