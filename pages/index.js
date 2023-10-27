import { CryptoDevsDAOABI, CryptoDevsDAOAddress, CryptoDevsNFTABI, CryptoDevsNFTAddress } from "@/constants";
import "@/constants";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Head from "next/head";
import { useEffect, useState } from "react";
import { formatEther } from "viem/utils";
import { useAccount, useBalance, useContractRead } from "wagmi";
import { readContract, waitForTransaction, writeContract } from "wagmi/actions";
import styles from "../styles/Home.module.css";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
})

export default function Home() {
  //@dev check if users' wallet is connected, and its address using Wagmi's hooks.
  const { address, isConnected } = useAccount();
  //@dev state variable to know if component has been mounted or not
  const [isMounted, setIsMounted] = useState(false);
  //@dev state var to show a loading state while waiting for a transaction to go through
  const [loading, setLoading] = useState(false);
  //@dev Fake NFT Token ID to purchase when creating a proposal
  const [fakeNftTokenId, setFakeNftTokenId] = useState("");
  //@dev state variables to store all the proposals in the dao, you can refactor to use filecoin and such later so as to save on costs
  const [proposals, setProposals] = useState([]);
  //@dev State var to switch between the CreateProposal and view Proposals tab
  const [selectedTab, setSelectedTab] = useState("");

  //Fetch the owner of the dao
  const daoOwner = useContractRead({
    abi: CryptoDevsDAOABI,
    address: CryptoDevsDAOAddress,
    functionName: "owner",
  });

  //Fetch the Balance of the DAO
  const daoBalance = useBalance({
    address: CryptoDevsDAOAddress,
  });
  //Fetch the number of proposals in the DAO
  const numOfProposalsInDAO = useContractRead({
    abi: CryptoDevsDAOABI,
    address: CryptoDevsDAOAddress,
    functionName: "numProposals",
  });
  //Fetch the CryptoDevs NFT balance of the User
  const nftBalanceOfUser = useContractRead({
    abi: CryptoDevsNFTABI,
    address: CryptoDevsNFTAddress,
    functionName: "balanceOf",
    args: [address],
  });
  //function to make a CreateProposal transaction in the DAO
  async function CreateProposal() {
    setLoading(true);

    try {
      const tx = await writeContract({
        address: CryptoDevsDAOAddress,
        abi: CryptoDevsDAOABI,
        functionName: "createProposal",
        args: [fakeNftTokenId],
      });

      await waitForTransaction(tx);
    } catch (error) {
      console.error(error);
      window.alert(error);
    }
    setLoading(false);
  }
  //Function to fetch a proposal by It's ID
  async function fetchProposalById(id) {
    try {
      const proposal = await readContract({
        address: CryptoDevsDAOAddress,
        abi: CryptoDevsDAOABI,
        functionName: "proposals",
        args: [id],
      });
      const [nftTokenId, deadline, yayVotes, nayVotes, executed] = proposal;
      const parsedProposal = {
        proposalId: id,
        nftTokenId: nftTokenId.toString(),
        deadline: new Date(parseInt(deadline.toString()) * 1000),
        yayVotes: yayVotes.toString(),
        nayVotes: nayVotes.toString(),
        executed: Boolean(executed),
      };
      return parsedProposal;
    } catch (error) {
      console.error(error);
      window.alert(error);
    }
  }
  //Function to fetch all proposals in the DAO
  async function fetchAllProposals() {
    try {
      const proposals = [];

      for (let i = 0; i < numOfProposalsInDAO.data; i++) {
        const proposal = await fetchProposalById(i);
        proposals.push(proposal);
      }
      setProposals(proposals);
      return proposals;
    } catch (error) {
      console.error(error);
      window.alert(error);
    }
  }
  //Function to vote YAY or NAY on a proposal
  async function voteForProposal(proposalId, vote) {
    setLoading(true);
    try {
      const tx = await writeContract({
        address: CryptoDevsDAOAddress,
        abi: CryptoDevsDAOABI,
        functionName: "voteOnProposal",
        args: [proposalId, vote === "YAY" ? 0 : 1],
      });

      await waitForTransaction(tx);
    } catch (error) {
      console.error(error);
      window.alert(error);
    }
    setLoading(false);
  }
  //function to execute a proposal after a deadline has passed
  async function executeProposal(proposalId) {
    setLoading(true);
    try {
      const tx = await writeContract({
        address: CryptoDevsDAOAddress,
        abi: CryptoDevsDAOABI,
        functionName: "executeProposal",
        args: [proposalId],
      });

      await waitForTransaction(tx);
    } catch (error) {
      console.error(error);
      window.alert(error);
    }
    setLoading(false);
  }
  //Function to withdraw ether from the ether contract
  async function withdrawDAOEther() {
    setLoading(true);
    try {
      const tx = await writeContract({
        address: CryptoDevsDAOAddress,
        abi: CryptoDevsDAOABI,
        functionName: "withdrawEther",
        args: [],
      });
      await waitForTransaction(tx);
    } catch (error) {
      console.error(error);
      window.alert(error);
    }
    setLoading(false);
  }
  //render the contents of the appropriate tab based on the selected tab
  function renderTabs() {
    if (selectedTab === "Create Proposal") {
      return renderCreateProposalTab();
    } else if (selectedTab === "View Proposals") {
      return renderViewProposalsTab();
    }
    return null;
  }
  //Renders the 'Create Proposal' tab content
  function renderCreateProposalTab() {
    if (loading) {
      return (
        <div className={styles.description}>
          Loading... Waiting for transaction...
        </div>
      );
    } else if (nftBalanceOfUser.data === 0) {
      return (
        <div className={styles.description}>
          You do not own any CryptoDevs NFTs. <br />
          <b>You cannot create or vote on proposals</b>
        </div>
      );
    } else {
      return (
        <div className={styles.container}>
          <label>Fake NFT Token ID to purchase: </label>
          <input
            placeholder="0"
            type="number"
            onChange={(e) => setFakeNftTokenId(e.target.value)} />
          <button className={styles.button2} onClick={CreateProposal}> Create </button>
        </div>
      );
    }
  }

  //Renders the 'View Proposals' tab content
  function renderViewProposalsTab() {
    if (loading) {
      return (
        <div className={styles.description}>
          Loading... Waiting for transaction...
        </div>
      );
    } else if (proposals.length === 0) {
      return (
        <div className={styles.description}> No proposals have been created</div>
      );
    } else {
      return (
        <div>
          {proposals.map((p, index) => (
            <div key={index} className={styles.card}>
              <p>Proposal ID: {p.proposalId}</p>
              <p>Fake NFT to Purchase: {p.nftTokenId}</p>
              <p>Deadline: {p.deadline.toLocaleString()}</p>
              <p>Yay Votes: {p.yayVotes}</p>
              <p>Nay Votes: {p.nayVotes}</p>
              <p>Executed?: {p.executed.toString()}</p>
              {p.deadline.getTime() > Date.now() && !p.executed ? (
                <div className={styles.flex}>
                  <button className={styles.button2}
                    onClick={() => voteForProposal(p.proposalId, "YAY")}>
                    Vote YAY </button>
                  <button className={styles.button2} onClick={() => voteForProposal(p.proposalId, "NAY")}> Vote NAY </button>
                </div>
              ) : p.deadline.getTime() < Date.now() && !p.executed ? (
                <div className={styles.flex}>
                  <button className={styles.button2}
                    onClick={() => executeProposal(p.proposalId)}>
                    Execute Proposal{" "}
                    {p.yayVotes > p.nayVotes ? "(YAY)" : "(NAY)"}
                  </button>
                </div>
              ) : (
                <div className={styles.description}>Proposal Executed</div>
              )
              }
            </div>
          )
          )
          }
        </div>
      );
    }
  }
  //piece of code that runs everytime the value of 'selectedTab' changes used to refetch all proposals in the DAo when the user switches to the 'View Proposals' tab

  useEffect(() => {
    if (selectedTab === "View Proposals") {
      fetchAllProposals();
    }
  }, []);
  if (!isMounted) return null;
  if (!isConnected)
    return (<div><ConnectButton /> </div>);
  return (
    <div className={inter.className}>
      <Head>
        <title>CryptoDevs DAO </title>
        <meta name="description" content="CryptoDevs DAO" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.main}>
        <div>
          <h1 className={styles.title}>Welcome to CryptoDevs!</h1>
          <div className={styles.description}>Welcome to the DAO!</div>
          <div className={styles.description}>Your CryptoDevs NFT Balance: {nftBalanceOfUser.data.toString()}<br />
            {daoBalance.data && (<> Treasury Balance: {" "}
              {formatEther(daoBalance.data.value).toString()} ETH </>
            )}
            <br />
            Total Number of Proposals: {numOfProposalsInDAO.data.toString()}</div>
          <div className={styles.flex}> <button className={styles.button} onClick={() => setSelectedTab("Create Proposal")}>
            Create Proposal </button>
            <button className={styles.button} onClick={() => setSelectedTab("View Proposals")}> View Proposals </button> </div>
          {renderTabs()}
          {/*Display additional withdraw button if connected wallet is owner*/}
          {address && address.toLowerCase() === daoOwner.data.toLowerCase() ? (
            <div> {loading ? (<button className={styles.button}>Loading...</button>) : (
              <button className={styles.button} onClick={withdrawDAOEther}> Withdraw DAO ETH </button>
            )}
            </div>
          ) : (
            ""
          )}
        </div>
        <div> <img className={styles.image} src="https://i.imgur.com/buNhbF7.png" /> </div>
      </div>
    </div>
  );
}
