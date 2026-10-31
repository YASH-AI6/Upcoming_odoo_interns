import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/config/prisma";
import { Role } from "@prisma/client";
import { getAuthToken } from "./helpers";

describe("Auth Module: Password Rules, Uniqueness & RBAC Staff Creation", () => {
  const uniquePrefix = Date.now();

  it("should reject signup when password is 8 characters or fewer (rule: MORE than 8 chars)", async () => {
    const res = await request(app)
      .post("/api/v1/auth/signup")
      .send({
        email: `short_pw_${uniquePrefix}@test.com`,
        password: "Abc!123", // 7 chars
        name: "Short Pw User"
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should reject signup when password lacks uppercase, lowercase, or special character", async () => {
    // Missing special character
    const res1 = await request(app)
      .post("/api/v1/auth/signup")
      .send({
        email: `no_special_${uniquePrefix}@test.com`,
        password: "Password12345",
        name: "No Special"
      });
    expect(res1.status).toBe(400);

    // Missing uppercase
    const res2 = await request(app)
      .post("/api/v1/auth/signup")
      .send({
        email: `no_upper_${uniquePrefix}@test.com`,
        password: "password123!",
        name: "No Upper"
      });
    expect(res2.status).toBe(400);

    // Missing lowercase
    const res3 = await request(app)
      .post("/api/v1/auth/signup")
      .send({
        email: `no_lower_${uniquePrefix}@test.com`,
        password: "PASSWORD123!",
        name: "No Lower"
      });
    expect(res3.status).toBe(400);
  });

  it("should successfully signup with valid password (> 8 chars with upper, lower, special) and create linked Customer", async () => {
    const res = await request(app)
      .post("/api/v1/auth/signup")
      .send({
        email: `valid_user_${uniquePrefix}@test.com`,
        password: "ValidPassword123!",
        name: "Valid User",
        city: "San Francisco"
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe(Role.CUSTOMER);
    expect(res.body.user.customerId).toBeDefined();
    expect(res.body.customer.name).toBe("Valid User");
  });

  it("should reject signup with duplicate email", async () => {
    const res = await request(app)
      .post("/api/v1/auth/signup")
      .send({
        email: `valid_user_${uniquePrefix}@test.com`,
        password: "ValidPassword123!",
        name: "Duplicate User"
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it("should login registered user and return JWT", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: `valid_user_${uniquePrefix}@test.com`,
        password: "ValidPassword123!"
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(`valid_user_${uniquePrefix}@test.com`);
  });

  it("should not reveal if email does not exist on forgot-password", async () => {
    const res = await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({
        email: `non_existent_${uniquePrefix}@random.org`
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain("If your email is registered");
  });

  it("should allow ADMIN to create STAFF users", async () => {
    const adminToken = getAuthToken(Role.ADMIN);
    const res = await request(app)
      .post("/api/v1/users/staff")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        email: `new_staff_${uniquePrefix}@example.com`,
        password: "StaffPassword123!"
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.role).toBe(Role.STAFF);
  });

  it("should reject STAFF or CUSTOMER trying to create STAFF users", async () => {
    const staffToken = getAuthToken(Role.STAFF);
    const res = await request(app)
      .post("/api/v1/users/staff")
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        email: `forbidden_staff_${uniquePrefix}@example.com`,
        password: "StaffPassword123!"
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
