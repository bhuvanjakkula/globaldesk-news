'use client';
import {useState} from 'react';
export default function SignOut(){const [message,setMessage]=useState('');return <><button className="button-link" onClick={async()=>{try{const r=await fetch('/account/actions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'logout'})});if(r.ok)window.location.replace('/account/access#signin');else setMessage('Please try signing out again.');}catch{setMessage('Service unavailable. Please retry.');}}}>Sign out</button><p role="status">{message}</p></>;}
