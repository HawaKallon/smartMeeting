"use server";

import { requireUser } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function createUser(
  _: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    const user = await requireUser();

    // Only ADMIN can create users
    if (user.role !== "ADMIN") {
      return { error: "You do not have permission to create users" };
    }

    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const role = formData.get("role") as string;

    if (!name || !email || !role) {
      return { error: "All fields are required" };
    }

    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return { error: "User with this email already exists" };
    }

    // Create user
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        role: role as any,
      },
    });

    // Send welcome email
    try {
      await resend.emails.send({
        from: "Smart Meeting <noreply@smartmeeting.gov>",
        to: email,
        subject: "Welcome to Smart Meeting",
        html: `
          <h2>Welcome to Smart Meeting</h2>
          <p>Hello ${name},</p>
          <p>Your account has been created and is ready to use. You can now log in with your email address.</p>
          <p><a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/login" style="background-color: #0f172a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Log In to Smart Meeting</a></p>
          <p><strong>Email:</strong> ${email}</p>
          <p>You'll be asked to sign in using your credentials. If you don't have a password, contact your administrator.</p>
          <p>Best regards,<br>Smart Meeting Team</p>
        `,
      });
    } catch (emailErr) {
      console.error("Failed to send email:", emailErr);
      // Continue even if email fails
    }

    // Audit log
    await audit({
      actorId: user.id,
      action: "CREATE_USER",
      entityType: "User",
      entityId: newUser.id,
      metadata: { name, email, role },
    });

    return { ok: true };
  } catch (err) {
    console.error("Failed to create user:", err);
    return { error: "Failed to create user" };
  }
}
