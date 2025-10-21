'use client'
import Image from "next/image";
import { useRouter } from "next/navigation"; 

export default function Home() {
  const router=useRouter();
  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] bg-red-700 items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <button onClick={()=>router.push("/auth")} className="bg-black text-white">Sign up</button>
    </div>
  );
}
