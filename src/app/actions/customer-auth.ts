"use server";

import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { clearCustomerSession, hashPassword, setCustomerSession, verifyPassword } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";

export async function registerCustomer(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const imageUrl = String(formData.get("imageUrl") ?? "").trim() || undefined;

  if (!name || !email || password.length < 8) {
    redirect("/crear-cuenta?error=invalid");
  }

  try {
    const customer = await prisma.customerAccount.create({
      data: {
        name,
        email,
        passwordHash: hashPassword(password),
        imageUrl,
      },
    });

    await setCustomerSession(customer.id);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirect("/crear-cuenta?error=exists");
    }
    throw error;
  }

  redirect("/cuenta");
}

export async function loginCustomer(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const customer = await prisma.customerAccount.findUnique({ where: { email } });
  if (!customer || !verifyPassword(password, customer.passwordHash)) {
    redirect("/login?error=1");
  }

  await setCustomerSession(customer.id);
  redirect("/cuenta");
}

export async function logoutCustomer() {
  await clearCustomerSession();
  redirect("/");
}
