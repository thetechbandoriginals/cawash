import { NextResponse } from 'next/server';
import { firestore } from '@/firebase'; // Using client SDK
import { doc, runTransaction, getDoc, setDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore'; // Using client SDK functions
import fetch from 'node-fetch';

export async function POST(request: Request) {
  const { reference, carwashId } = await request.json();
  const secretKey = process.env.PAYSTACK_SECRET_KEY;

  if (!reference || !carwashId || !secretKey) {
    return NextResponse.json({ success: false, message: 'Missing required parameters.' }, { status: 400 });
  }

  const url = `https://api.paystack.co/transaction/verify/${reference}`;
  
  try {
    const paystackResponse = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    });

    const paystackData = await paystackResponse.json() as any;

    if (paystackData.status && paystackData.data.status === 'success') {
      const { amount, currency } = paystackData.data;
      const creditsPurchased = amount / 100; // Since amount is in kobo/cents

      if (currency !== 'KES') {
        throw new Error('Invalid currency.');
      }
      
      // Using client SDK transaction
      await runTransaction(firestore, async (transaction) => {
        const transactionRef = doc(firestore, 'transactions', reference);
        const carwashRef = doc(firestore, 'carwashes', carwashId);
        
        const transactionDoc = await transaction.get(transactionRef);
        if (transactionDoc.exists()) {
            // This prevents replay attacks where the same transaction is verified multiple times.
            console.log('This transaction has already been processed.');
            return; 
        }

        transaction.set(transactionRef, {
            id: reference,
            carwashId,
            amount: creditsPurchased,
            credits: creditsPurchased,
            status: 'Completed',
            paystackRef: reference,
            createdAt: serverTimestamp(), // client SDK serverTimestamp
        });
        
        transaction.update(carwashRef, {
            credits: increment(creditsPurchased), // client SDK increment
        });
      });


      return NextResponse.json({ success: true, message: 'Payment verified and credits added.', credits: creditsPurchased });
    } else {
      throw new Error('Payment verification failed.');
    }
  } catch (error: any) {
    console.error('Paystack verification error:', error);
    return NextResponse.json({ success: false, message: 'An internal error occurred during payment verification.' }, { status: 500 });
  }
}
