"use server"

import { revalidatePath } from "next/cache"

export async function revalidateSystem() {
  revalidatePath("/", "layout")
}
