import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { AnchorCrudItem } from "../target/types/anchor_crud_item";
import { expect } from "chai";
import BN from "bn.js";

describe("anchor_crud_item", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider() as anchor.AnchorProvider;
  const program = anchor.workspace.anchorCrudItem as Program<AnchorCrudItem>;

  // helper to derive PDA for item given owner and id
  const derivePda = async (owner: PublicKey, id: number) => {
    const idBuf = new BN(id).toArrayLike(Buffer, "le", 8);
    const [pda] = await PublicKey.findProgramAddress(
      [Buffer.from("item"), owner.toBuffer(), idBuf],
      program.programId
    );
    return pda;
  };

  it("create -> fetch -> update -> read -> delete flow", async () => {
    const owner = provider.wallet.publicKey;
    const id = 42;
    const name1 = "first item";
    const value1 = 123;
    const name2 = "updated item name";
    const value2 = 777;

    const itemPda = await derivePda(owner, id);

    // CREATE
    await program.methods
      .create(new BN(id), name1, value1)
      .accounts({
      user: owner,
      item: itemPda,
      systemProgram: SystemProgram.programId,
      } as any)
      .rpc();


    // FETCH (read account directly)
    const account = await program.account.item.fetch(itemPda);
    expect(account.owner.toBase58()).to.equal(owner.toBase58());
    expect(account.id.toNumber ? account.id.toNumber() : account.id).to.equal(id);
    expect(account.name).to.equal(name1);
    expect(account.value).to.equal(value1);

    // UPDATE
    await program.methods
      .update(new BN(id), name2, value2)
      .accounts({
      owner: owner,
      item: itemPda,
      } as any)
      .rpc();

    // FETCH after update
    const updated = await program.account.item.fetch(itemPda);
    expect(updated.name).to.equal(name2);
    expect(updated.value).to.equal(value2);

    // READ instruction (emits event) - call it (the event will be emitted, but we also fetch account)
    await program.methods
      .read(new BN(id))
      .accounts({
      owner: owner,
      item: itemPda,
      } as any)
      .rpc();

    // DELETE (close the account and return lamports to owner)
    await program.methods
      .delete(new BN(id))
      .accounts({
      owner: owner,
      item: itemPda,
      } as any)
      .rpc();

    // After delete, fetching should fail — assert that account no longer exists
    let fetchFailed = false;
    try {
      await program.account.item.fetch(itemPda);
    } catch (err) {
      fetchFailed = true;
    }
    expect(fetchFailed).to.equal(true);
  }).timeout(100000); // give plenty of time for local validator
});
