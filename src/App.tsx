import React, { useState, useEffect } from 'react';
import { ConnectButton, useWallet } from '@suiet/wallet-kit';
import { Wallet, Plus, Edit2, Trash2, Vote as VoteIcon } from 'lucide-react';
// Correct Imports for the current Sui SDK versions
import { SuiClient } from '@mysten/sui/client'; 
import { Transaction } from '@mysten/sui/transactions'; 

interface VoteItem {
  id: string;
  option: string;
  votes: number;
}

// Initialize the RPC client using the current name: SuiClient
const provider = new SuiClient({ url: 'https://fullnode.testnet.sui.io' }); 

// The Package ID (This is CORRECT)
const PACKAGE_ID = '0x1ca4878af7a847ccca3cd9ae9793988fecae23229684392d184788d7a4f562ce';

// The correct module name based on your input
const VOTING_MODULE_NAME = 'simple_vote';

// 🚀 FIX 1 (Confirmed): The actual Shared Poll Object ID. 
const VOTING_OBJECT_ID = '0x644533e59a97f28528a40cae230a90920373786d106c5c0efd5'; 

// --- MOCK DATA FETCHING (Replace with actual fetch logic) ---
const mockFetchVotes = async (client: SuiClient, objectId: string): Promise<VoteItem[]> => {
    // In a real application, you would use client.getObject and client.getDynamicFields
    // to fetch the state of your MultiVote object.
    console.log("MOCK: Simulating fetching votes from chain...");
    await new Promise(resolve => setTimeout(resolve, 500)); 
    return [
        { id: '1', option: 'Option A (Fetched)', votes: 15 },
        { id: '2', option: 'Option B (Fetched)', votes: 10 },
    ];
};
// -----------------------------------------------------------


function App() {
  const wallet = useWallet();
  const connected = wallet.connected;
  const accountAddress = wallet.account?.address;
  const disconnect = wallet.disconnect;

  const [votes, setVotes] = useState<VoteItem[]>([]);
  const [newOption, setNewOption] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [loadingTx, setLoadingTx] = useState(false);
  const [dataLoading, setDataLoading] = useState(false); // For initial data load

  // --- DATA FETCHING EFFECT ---
  const fetchVotes = async () => {
    if (!connected || VOTING_OBJECT_ID === PACKAGE_ID) return;
    setDataLoading(true);
    try {
        const fetched = await mockFetchVotes(provider, VOTING_OBJECT_ID);
        setVotes(fetched);
    } catch (e) {
        console.error("Failed to fetch state:", e);
    } finally {
        setDataLoading(false);
    }
  };

  useEffect(() => {
    fetchVotes();
  }, [connected]);

  // Helper: submit "add option" to chain
  const addOptionOnChain = async (option: string) => {
    if (!connected || !wallet.signAndExecuteTransaction) {
      alert('Please connect your wallet first.');
      return null;
    }
    if (!option.trim()) return null;

    try {
      setLoadingTx(true);
      const tx = new Transaction(); // Use Transaction class
      
      tx.moveCall({
        // 🚀 FIX 3: Changing the function name to 'create_poll' as requested.
        target: `${PACKAGE_ID}::${VOTING_MODULE_NAME}::create_poll`,
        // Arguments: [Shared Object, new option text (string)]
        arguments: [
          // ⚠️ Using the standard '0x' prefixed ID
          tx.object(VOTING_OBJECT_ID), 
          tx.pure.string(option)      // The new option text
        ],
      });

      // Flattened the options property into the root object
      const result = await wallet.signAndExecuteTransaction({
        transaction: tx,
        showEffects: true, 
        requestType: 'WaitForLocalExecution' 
      });

      console.log('addOption tx result', result);
      return result;
    } catch (e) {
      console.error('addOptionOnChain error', e);
      throw e;
    } finally {
      setLoadingTx(false);
    }
  };

  // Helper: submit "cast vote" to chain
  const castVoteOnChain = async (optionId: string) => {
    if (!connected || !wallet.signAndExecuteTransaction) {
      alert('Please connect your wallet first.');
      return null;
    }

    try {
      setLoadingTx(true);
      const tx = new Transaction(); // Use Transaction class
      
      tx.moveCall({
        // 🚀 FIX 2 (Confirmed): Function name is 'new_vote'
        target: `${PACKAGE_ID}::${VOTING_MODULE_NAME}::new_vote`, 
        // Arguments: [Shared Object, option ID (string)]
        arguments: [
          // ⚠️ Using the standard '0x' prefixed ID
          tx.object(VOTING_OBJECT_ID), 
          tx.pure.string(optionId)      // The option ID (string)
        ],
      });

      // Flattened the options property into the root object
      const result = await wallet.signAndExecuteTransaction({
        transaction: tx,
        showEffects: true, 
        requestType: 'WaitForLocalExecution' 
      });

      console.log('castVote tx result', result);
      return result;
    } catch (e) {
      console.error('castVoteOnChain error', e);
      throw e;
    } finally {
      setLoadingTx(false);
    }
  };

  // 1. ADD VOTE OPTION (calls on-chain then refreshes state)
  const addOption = async () => {
    if (!newOption.trim()) return;

    try {
      await addOptionOnChain(newOption);
      setNewOption('');
      // Refresh data after successful transaction
      await fetchVotes();
    } catch (e) {
      alert('Failed to add option on chain. See console for details.');
    }
  };

  // 2. CAST VOTE (calls on-chain then refreshes state)
  const castVote = async (id: string) => {
    try {
      await castVoteOnChain(id);
      // Refresh data after successful transaction
      await fetchVotes();
    } catch (e) {
      alert('Failed to cast vote on chain. See console for details.');
    }
  };
  
  // NOTE: EDIT and DELETE actions should also be implemented with tx.moveCall 
  // and followed by a call to fetchVotes() for state synchronization.

  // 3. EDIT VOTE OPTION (client-only for now)
  const startEdit = (id: string, currentOption: string) => {
    setEditingId(id);
    setEditingValue(currentOption);
  };

  const saveEdit = () => {
    if (!editingValue.trim() || !editingId) return;
    
    // MOCK client-only update:
    setVotes((prev) =>
      prev.map((vote) =>
        vote.id === editingId ? { ...vote, option: editingValue } : vote
      )
    );
    setEditingId(null);
    setEditingValue('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingValue('');
  };

  // 4. DELETE VOTE OPTION (client-only for now)
  const deleteOption = (id: string) => {
    // MOCK client-only update:
    setVotes((prev) => prev.filter((vote) => vote.id !== id));
  };

  const getTotalVotes = () => votes.reduce((sum, vote) => sum + vote.votes, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-8 text-white">
            <header className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <VoteIcon className="w-10 h-10" />
                <div>
                  <h1 className="text-3xl font-bold">Sui Voting Platform</h1>
                  <p className="text-blue-100 mt-1">Decentralized Voting on Sui Network</p>
                </div>
              </div>

              {/* INTEGRATED WALLET BUTTON */}
              <div>
                {!connected ? (
                  <ConnectButton
                    className="flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-xl font-semibold hover:bg-blue-50 transition-all duration-200 shadow-lg"
                  />
                ) : (
                  <div className="flex flex-col items-end gap-2">
                    <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg text-sm font-mono">
                      {accountAddress}
                    </div>
                    <button
                      onClick={() => disconnect()}
                      className="text-blue-100 hover:text-white text-sm transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>
                )}
              </div>
            </header>
          </div>

          <div className="p-8">
            {/* LOADING OVERLAY for Transactions */}
            {loadingTx && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
                    <div className="text-xl font-semibold text-blue-600">Processing Transaction...</div>
                </div>
            )}

            {!connected ? (
              <div className="text-center py-16">
                <Wallet className="w-20 h-20 mx-auto text-slate-300 mb-4" />
                <h2 className="text-2xl font-semibold text-slate-700 mb-2">
                  Connect Your Wallet
                </h2>
                <p className="text-slate-500">
                  Please connect your wallet to start adding options and voting.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* ADD OPTION SECTION */}
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-100">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={newOption}
                      onChange={(e) => setNewOption(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addOption()}
                      placeholder="Enter voting option..."
                      className="flex-1 px-4 py-3 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={loadingTx}
                    />
                    <button
                      onClick={addOption}
                      className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
                      disabled={loadingTx}
                    >
                      <Plus className="w-5 h-5" />
                      {loadingTx ? 'Sending...' : 'Add Option'}
                    </button>
                  </div>
                </div>

                {/* TOTAL VOTES HEADER */}
                <div className="flex items-center justify-between py-4 border-b border-slate-200">
                  <h2 className="text-xl font-bold text-slate-800">Voting Options</h2>
                  <div className="bg-slate-100 px-4 py-2 rounded-lg">
                    <span className="text-sm text-slate-600">Total Votes: </span>
                    <span className="text-lg font-bold text-slate-800">{getTotalVotes()}</span>
                  </div>
                </div>

                {/* VOTING LIST */}
                {(votes.length === 0 && !dataLoading) ? (
                  <div className="text-center py-12">
                    <div className="text-slate-400 mb-2">
                      <VoteIcon className="w-16 h-16 mx-auto opacity-50" />
                    </div>
                    <p className="text-slate-500">No voting options yet. Add one to get started!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dataLoading ? (
                        <div className="text-center py-8 text-slate-500">Loading options from Sui...</div>
                    ) : (
                        votes.map((vote, idx) => (
                          <div
                            key={vote.id}
                            className="bg-white border-2 border-slate-200 rounded-xl p-5 hover:border-blue-300 transition-all duration-200 hover:shadow-md"
                          >
                            {editingId === vote.id ? (
                              <div className="flex gap-3">
                                <input
                                  type="text"
                                  value={editingValue}
                                  onChange={(e) => setEditingValue(e.target.value)}
                                  onKeyPress={(e) => e.key === 'Enter' && saveEdit()}
                                  className="flex-1 px-3 py-2 rounded-lg border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  autoFocus
                                />
                                <button
                                  onClick={saveEdit}
                                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-300 transition-colors font-medium"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <h3 className="text-lg font-semibold text-slate-800 mb-2">
                                    {vote.option}
                                  </h3>
                                  <div className="flex items-center gap-4">
                                    <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                                      <div
                                        className="bg-gradient-to-r from-blue-500 to-cyan-500 h-full transition-all duration-500"
                                        style={{
                                          width: `${getTotalVotes() > 0 ? (vote.votes / getTotalVotes()) * 100 : 0}%`,
                                        }}
                                      />
                                    </div>
                                    <span className="text-lg font-bold text-slate-700 min-w-[3rem] text-right">
                                      {vote.votes}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 ml-6">
                                  <button
                                    onClick={() => castVote(vote.id)}
                                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                                    disabled={loadingTx}
                                    title="Cast vote on chain"
                                  >
                                    Vote
                                  </button>
                                  <button
                                    onClick={() => startEdit(vote.id, vote.option)}
                                    className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Edit"
                                  >
                                    <Edit2 className="w-5 h-5" />
                                  </button>
                                  <button
                                    onClick={() => deleteOption(vote.id)}
                                    className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;