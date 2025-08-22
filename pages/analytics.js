import { useState } from 'react';
import Head from 'next/head';
import Navbar from '../components/Navbar';
import LockedPage from '../components/LockedPage';

export default function Analytics() {
  return (
    <>
      <Head>
        <title>Analytics - Ethos</title>
        <meta name="description" content="Analytics page for Ethos Network" />
        <link rel="icon" href="/ethos.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </Head>
      
      <Navbar />
      <LockedPage pageName="Analytics" />
    </>
  );
}