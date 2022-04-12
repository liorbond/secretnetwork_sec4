import React from 'react';
import './App.css';
import { ToastContainer, toast } from 'react-toastify';
import { Wallet, SecretNetworkClient, fromUtf8 } from "secretjs";
import 'react-toastify/dist/ReactToastify.css';
import type { ReactElement } from "react";

declare global {
  interface Window {
    keplr:any;
    walletPubAddress: string;
    
  }
}

function successNotification(message: string) {
  toast.success(message, {
    autoClose: 4000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: false,
    progress: undefined,
    });
}

function errorNotification(message: string) {
  toast.error(message, {
    autoClose: 4000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: false,
    progress: undefined,
    });
}

function loadingNotification() {

  toast.info("Calculating...", {
    autoClose: 20000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: false,
    progress: undefined,
    });
}

type EquationVariables = {
  x: string;
  y: string;
};

type UserCalculation = {
  eq: EquationVariables;
  op: string;
  res: string;
  timestamp: string;
};

type QueryAnswer = {
  status: string;
  calculations: Array<UserCalculation>;
};

type QueryAnswerWrapped = {
  get_user_calculations: QueryAnswer;
};

type CalcHandleAnswer = {
  status: string;
  res: string;
};

function App() {
  let walletPubAddress : string = '';
  let keplrOfflineSigner : any;
  let storedOp : string = '';
  const chainId : string = 'secret-4'
  const contractAddress: string = 'secret14l5x8sgrndwqat0nzmecjupekm06dyz6g4s80j';
  let contractCodeHash: string = "5915d49d72ad7efe1ec121f9145c51c2da00c5f06491e6b0c7808d8cf6413c5c";

  const getClient = async () => {
    const nodeRpcAddress : string = "http://20.63.36.149:9091";
    const client = await SecretNetworkClient.create({
      grpcWebUrl: nodeRpcAddress,
      chainId: chainId,
      wallet: keplrOfflineSigner,
      walletAddress: walletPubAddress,
    });

    //contractCodeHash = await client.query.compute.codeHash(444);
    //errorNotification(contractCodeHash);
    return client;
  }

  const hideAll = async () => {
    document.getElementById('op-buttons')!.hidden = true;
    document.getElementById('result-button')!.hidden = true;
    document.getElementById('xy-inputs')!.hidden = true;
    document.getElementById('sqrt-input')!.hidden = true;
    document.getElementById('back-command')!.hidden = true;
    document.getElementById('historyLabel')!.hidden = true;
    (document.getElementById('First') as HTMLInputElement).value = "";
    (document.getElementById('Second') as HTMLInputElement).value = "";
    (document.getElementById('Third') as HTMLInputElement).value = "";
  }

  const connectKeplrWalletHandler = async () => {
    if(!window.keplr) {
      errorNotification("Keplr plugin is not enabled");
      return;
    }

    hideAll();

    await window.keplr.enable(chainId);
    keplrOfflineSigner = window.keplr.getOfflineSignerOnlyAmino(chainId);
    const [{ address: keplrAddress }] = await keplrOfflineSigner.getAccounts();
    walletPubAddress = keplrAddress;
    successNotification(`Wallet was connected successfuly`);

    const keplrButton = document.getElementById('connectKeplrWallet')!; 

    keplrButton.textContent = "Reconnect Keplr Wallet";
    keplrButton.classList.remove('keplr-btn');
    keplrButton.classList.add('keplr-clicked-btn');

    document.getElementById('AddressLabel')!.textContent = `Address: ${keplrAddress}`;
    document.getElementById('op-buttons')!.hidden = false;
  }

  
  const xyOpHandler = async() => {
    hideAll();
    document.getElementById('opLabel')!.textContent = storedOp;
    document.getElementById('xy-inputs')!.hidden = false;

    document.getElementById('result-button')!.hidden = false;
    document.getElementById('back-command')!.hidden = false;

    const resultButton = document.getElementById('resultButton')!;
    resultButton.classList.remove('result-btn-sqrt-pos');
    resultButton.classList.add('result-btn-pos');
  }

  const validateInput = (input : string ) => {
    if(input === '') {
      errorNotification(`All values must be set`);
      return false;
    }

    if(input.includes('-')) {
      errorNotification(`Negative values aren't supported`);
      return false;
    }

    if(input.includes('.')) {
      errorNotification(`Floating points aren't supported`);
      return false;
    }

    return true;
  }


  const validateXYOp = () => {
    if(!validateInput((document.getElementById('First') as HTMLInputElement).value) || 
       !validateInput((document.getElementById('Second') as HTMLInputElement).value)) {
        return false;
    }

    return true;
  }

  const validateSqrt = () => {
    if(!validateInput((document.getElementById('Third') as HTMLInputElement).value)) {
        return false;
    }

    return true;

  }

  const calculateAdd = async () => {
    if(!validateXYOp()) {
      return false;
    }

    const client = await getClient();

    document.getElementById('result-button')!.hidden = true;
    let eq: EquationVariables = { x: (document.getElementById('First') as HTMLInputElement).value, 
                                  y: (document.getElementById('Second') as HTMLInputElement).value }; 
    
    loadingNotification();
    const tx = await client.tx.compute.executeContract(
      {
        sender: client.address,
        contractAddress: contractAddress,
        codeHash: contractCodeHash,
        msg: {
          add: { eq: eq },
        },
        sentFunds: [],
      },
      {
        gasLimit: 40000,
      }
    );
    
    document.getElementById('result-button')!.hidden = false;
    let ans : CalcHandleAnswer = JSON.parse(fromUtf8(tx.data[0])).add;
    if(ans.status !== '') {
      errorNotification(`Error while sending TX: ${ans.status}`);
      return false;
    }

    successNotification(`Result is: ${ans.res}`);

    return true;
  }

  const calculateSub = async () => {
    if(!validateXYOp()) {
      return false;
    }

    const client = await getClient();

    loadingNotification();
    document.getElementById('result-button')!.hidden = true;
    let eq: EquationVariables = { x: (document.getElementById('First') as HTMLInputElement).value, 
                                  y: (document.getElementById('Second') as HTMLInputElement).value }; 
    const tx = await client.tx.compute.executeContract(
      {
        sender: client.address,
        contractAddress: contractAddress,
        codeHash: contractCodeHash,
        msg: {
          sub: { eq: eq },
        },
        sentFunds: [],
      },
      {
        gasLimit: 40000,
      }
    );
    
    document.getElementById('result-button')!.hidden = false;
    let ans : CalcHandleAnswer = JSON.parse(fromUtf8(tx.data[0])).sub;
    if(ans.status !== '') {
      errorNotification(`Error while sending TX: ${ans.status}`);
      return false;
    }

    successNotification(`Result is: ${ans.res}`);

    return true;
  }

  const calculateMul = async () => {
    if(!validateXYOp()) {
      return false;
    }

    const client = await getClient();

    document.getElementById('result-button')!.hidden = true;
    loadingNotification();
    let eq: EquationVariables = { x: (document.getElementById('First') as HTMLInputElement).value, 
                                  y: (document.getElementById('Second') as HTMLInputElement).value }; 
    const tx = await client.tx.compute.executeContract(
      {
        sender: client.address,
        contractAddress: contractAddress,
        codeHash: contractCodeHash,
        msg: {
          mul: { eq: eq },
        },
        sentFunds: [],
      },
      {
        gasLimit: 40000,
      }
    );
    
    document.getElementById('result-button')!.hidden = false;
    let ans : CalcHandleAnswer = JSON.parse(fromUtf8(tx.data[0])).mul;
    if(ans.status !== '') {
      errorNotification(`Error while sending TX: ${ans.status}`);
      return false;
    }

    successNotification(`Result is: ${ans.res}`);

    return true;
  }

  const calculateDiv = async () => {
    if(!validateXYOp()) {
      return false;
    }

    const client = await getClient();

    document.getElementById('result-button')!.hidden = true;
    loadingNotification();
    let eq: EquationVariables = { x: (document.getElementById('First') as HTMLInputElement).value, 
                                  y: (document.getElementById('Second') as HTMLInputElement).value }; 
    const tx = await client.tx.compute.executeContract(
      {
        sender: client.address,
        contractAddress: contractAddress,
        codeHash: contractCodeHash,
        msg: {
          div: { eq: eq },
        },
        sentFunds: [],
      },
      {
        gasLimit: 40000,
      }
    );
    
    document.getElementById('result-button')!.hidden = false;
    let ans : CalcHandleAnswer = JSON.parse(fromUtf8(tx.data[0])).div;
    if(ans.status !== '') {
      errorNotification(`Error while sending TX: ${ans.status}`);
      return false;
    }

    successNotification(`Result is: ${ans.res}`);

    return true;
  }

  const calculateSqrt = async () => {
    if(!validateSqrt()) {
      return false;
    }

    const client = await getClient();

    document.getElementById('result-button')!.hidden = true;
    loadingNotification();
    const tx = await client.tx.compute.executeContract(
      {
        sender: client.address,
        contractAddress: contractAddress,
        codeHash: contractCodeHash,
        msg: {
          sqrt: { x: (document.getElementById('Third') as HTMLInputElement).value },
        },
        sentFunds: [],
      },
      {
        gasLimit: 40000,
      }
    );
    
    document.getElementById('result-button')!.hidden = false;
    let ans : CalcHandleAnswer = JSON.parse(fromUtf8(tx.data[0])).sqrt;
    if(ans.status !== '') {
      errorNotification(`Error while sending TX: ${ans.status}`);
      return false;
    }

    successNotification(`Result is: ${ans.res}`);

    return true;
  }

  const addButtonHandler = async () => {
    storedOp = '+';
    xyOpHandler();
  }

  const subButtonHandler = async () => {
    storedOp = '-';
    xyOpHandler();
  }

  const mulButtonHandler = async () => {
    storedOp = 'x';
    xyOpHandler();
  }

  const divButtonHandler = async () => {
    storedOp = '/';
    xyOpHandler();
  }

  const sqrtButtonHandler = async () => {
    storedOp = 'sqrt';
    hideAll();
    document.getElementById('sqrt-input')!.hidden = false;

    document.getElementById('result-button')!.hidden = false;
    document.getElementById('back-command')!.hidden = false;

    const resultButton = document.getElementById('resultButton')!;

    resultButton.classList.remove('result-btn-pos');
    resultButton.classList.add('result-btn-sqrt-pos');
  }

  const userCalculationToString = (calc: UserCalculation) => {
    switch(calc.op) {
      case 'Add':
        return `${calc.timestamp}:   ${calc.eq.x} + ${calc.eq.y} = ${calc.res}`;
      case 'Sub':
      return `${calc.timestamp}:   ${calc.eq.x} - ${calc.eq.y} = ${calc.res}`;
      case 'Mul':
      return `${calc.timestamp}:   ${calc.eq.x} x ${calc.eq.y} = ${calc.res}`;
      case 'Div':
      return `${calc.timestamp}:   ${calc.eq.x} / ${calc.eq.y} = ${calc.res}`;
      case 'Sqrt':
      return `${calc.timestamp}:   sqrt of ${calc.eq.x} which is ${calc.res}`;
    }
  }

  const getTxButtonHandler = async () => {
    hideAll();
    document.getElementById('historyLabel')!.hidden = false;
    document.getElementById('historyLabel')!.textContent = 'Loading...';

    const client = await getClient();
    const queryAnswer = (await client.query.compute.queryContract({
    contractAddress: contractAddress,
    codeHash: contractCodeHash,
    query: { get_user_calculations: { user_cookie: walletPubAddress } },
    })) as QueryAnswerWrapped;

    console.log(JSON.stringify(queryAnswer));

    if(queryAnswer.get_user_calculations.status !== '') {
      errorNotification(`Query failed: ${queryAnswer.get_user_calculations.status}`)
      document.getElementById('historyLabel')!.textContent = queryAnswer.get_user_calculations.status;
    } else {
      let operations : string = '';
      for(let operation of queryAnswer.get_user_calculations.calculations) {
        operations += userCalculationToString(operation) + '<br/>';
      }

      document.getElementById('historyLabel')!.innerHTML = operations;
    }

    document.getElementById('back-command')!.hidden = false;
    
  }

  const backButtonHandler = async () => {
    hideAll();
    document.getElementById('op-buttons')!.hidden = false;
  }

  const resultButtonHandler = async () => {

    const calculate = async () => {
      switch(storedOp) {
        case '+':
          return calculateAdd();
        case '-':
          return calculateSub();
        case 'x':
          return calculateMul();
        case '/':
          return calculateDiv();
        case 'sqrt':
          return calculateSqrt();
        default:
          return true;
      }
    }
    
    if(await calculate()) {
      hideAll();
      document.getElementById('op-buttons')!.hidden = false;
    }

  }

  function connectKeplrWallet() : ReactElement {
    return (
      <button className="keplr-btn top-right-btn" id="connectKeplrWallet" onClick={connectKeplrWalletHandler}>Connect Keplr Wallet</button>
    );
  }

  function addButton() : ReactElement {
    return (
      <button className="op-btn op-btn-pos-1" id="addButton" onClick={addButtonHandler}>+</button>
    );
  }

  function subButton() : ReactElement {
    return (
      <button className="op-btn op-btn-pos-2" id="subButton" onClick={subButtonHandler}>-</button>
    );
  }

  function mulButton() : ReactElement {
    return (
      <button className="op-btn op-btn-pos-3" id="mulButton" onClick={mulButtonHandler}>x</button>
    );
  }

  function divButton() : ReactElement {
    return (
      <button className="op-btn op-btn-pos-4" id="divButton" onClick={divButtonHandler}>/</button>
    );
  }

  function sqrtButton() : ReactElement {
    return (
      <button className="op-btn op-btn-pos-5" id="sqrtButton" onClick={sqrtButtonHandler}>&#8730;</button>
    );
  }

  function getTxButton() : ReactElement {
    return (
      <button className="get-tx-btn get-tx-btn-pos" id="getTxButton" onClick={getTxButtonHandler}>History</button>
    );
  }

  function backButton() : ReactElement {
    return (
      <button className="get-tx-btn get-tx-btn-pos" id="backButton" onClick={backButtonHandler}>Back</button>
    );
  }

  function resultButton() : ReactElement {
    return (
      <button className="op-btn result-btn-pos" id="resultButton" onClick={resultButtonHandler}>=</button>
    );
  }

  return (
    <div className="main">
      <div className="card-div">
        <h2>Secret Calculator</h2>
        <label htmlFor="connectKeplrWallet" id="AddressLabel" className='keplr-lbl address-position'></label>
        <label id="historyLabel" className="inner-card" hidden/>
        <div id="op-buttons" hidden>
          {addButton()}
          {subButton()}
          {mulButton()}
          {divButton()}
          {sqrtButton()}
          {getTxButton()}
        </div>
        <div id="result-button" hidden>
          {resultButton()}
        </div>
        <div id="xy-inputs" hidden>
          <input type="number" inputMode="numeric" pattern="[0-9]*" id="First" className="input-cls first-input-pos"/>
          <input type="number" inputMode="numeric" pattern="[0-9]*" id="Second" className="input-cls second-input-pos"/>
          <label id="opLabel" className='op-lbl'>+</label>
        </div>
        <div id="sqrt-input" hidden>
          <input type="number" inputMode="numeric" pattern="[0-9]*" id="Third" className="input-cls third-input-pos"/>
          <label id="sqrtLabel" className='sqrt-lbl'>&#8730;</label>
        </div>
        <div id="back-command" hidden>
          {backButton()}
        </div>
      </div>
      <div className="wrap">
        {connectKeplrWallet()}
      </div>
      <div>
        <ToastContainer position="bottom-right"/>
      </div>
    </div>
  );


}

export default App;
