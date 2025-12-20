import { doc, getDoc, setDoc } from 'firebase/firestore';
import { firestore } from '@/firebase';

export async function seedGlobalSettings() {
    const settingsRef = doc(firestore, 'settings', 'global');
    try {
        const docSnap = await getDoc(settingsRef);
        if (!docSnap.exists()) {
            console.log('Global settings not found, creating with default values...');
            await setDoc(settingsRef, {
                jobCardCost: 1.5,
                minCreditPurchase: 50,
                expenseCreditCost: 0.5,
            });
            console.log('Default global settings created.');
        }
    } catch (error) {
        console.error("Error seeding global settings:", error);
    }
}
