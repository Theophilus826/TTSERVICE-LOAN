import { useEffect, useMemo, useState } from "react";
import {
  Search,
  ShieldCheck,
  ShieldOff,
  UserCheck,
  UserX,
  RefreshCw,
} from "lucide-react";
import { toast } from "react-toastify";

import API from "../services/Api";
import { useAppSelector } from "../layout/hooks";

interface AdminUser {
  _id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  avatar?: string | null;

  role?:
    | "customer"
    | "admin"
    | "loan_officer"
    | "risk_officer"
    | "finance"
    | "support"
    | "super_admin";

  isAdmin?: boolean;

  accountStatus?:
    | "active"
    | "suspended"
    | "blocked"
    | "closed";

  isVerified?: boolean;
  kycStatus?: string;
  borrowerStatus?: string;

  coins?: number;
  online?: boolean;

  createdAt?: string;
}

interface UsersResponse {
  success: boolean;
  count: number;
  data: AdminUser[];
}

const roleOptions = [
  "customer",
  "admin",
  "loan_officer",
  "risk_officer",
  "finance",
  "support",
  "super_admin",
];

export default function AdminUsers() {
  const { user: currentUser } = useAppSelector(
    (state) => state.auth,
  );

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] =
    useState("all");

  const [updatingUser, setUpdatingUser] =
    useState<string | null>(null);

  // =====================================================
  // LOAD USERS
  // =====================================================

  const loadUsers = async () => {
    try {
      setLoading(true);

      const response =
        await API.get<UsersResponse>("/users");

      setUsers(response.data.data || []);
    } catch (error: any) {
      console.error(
        "Failed to load users:",
        error,
      );

      toast.error(
        error?.response?.data?.message ||
          "Failed to load users",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // =====================================================
  // FILTER USERS
  // =====================================================

  const filteredUsers = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    return users.filter((item) => {
      const matchesSearch =
        !query ||
        item.name
          ?.toLowerCase()
          .includes(query) ||
        item.email
          ?.toLowerCase()
          .includes(query) ||
        item.phone
          ?.toLowerCase()
          .includes(query);

      const matchesRole =
        roleFilter === "all" ||
        item.role === roleFilter;

      return (
        matchesSearch &&
        matchesRole
      );
    });
  }, [users, search, roleFilter]);

  // =====================================================
  // UPDATE ROLE
  // =====================================================

  const updateRole = async (
    targetUser: AdminUser,
    role: string,
  ) => {
    if (
      !currentUser ||
      targetUser._id === currentUser._id
    ) {
      toast.error(
        "You cannot change your own role.",
      );
      return;
    }

    try {
      setUpdatingUser(targetUser._id);

      await API.patch(
        `/users/${targetUser._id}/role`,
        {
          role,
        },
      );

      setUsers((previous) =>
        previous.map((item) =>
          item._id === targetUser._id
            ? {
                ...item,
                role: role as AdminUser["role"],
                isAdmin:
                  role === "admin" ||
                  role === "super_admin",
              }
            : item,
        ),
      );

      toast.success(
        "User role updated successfully",
      );
    } catch (error: any) {
      console.error(
        "Role update failed:",
        error,
      );

      toast.error(
        error?.response?.data?.message ||
          "Failed to update user role",
      );
    } finally {
      setUpdatingUser(null);
    }
  };

  // =====================================================
  // STATUS
  // =====================================================

  const updateStatus = async (
    targetUser: AdminUser,
    status:
      | "active"
      | "suspended"
      | "blocked",
  ) => {
    if (
      currentUser &&
      targetUser._id === currentUser._id
    ) {
      toast.error(
        "You cannot change your own account status.",
      );
      return;
    }

    try {
      setUpdatingUser(targetUser._id);

      await API.patch(
        `/users/${targetUser._id}/status`,
        {
          accountStatus: status,
        },
      );

      setUsers((previous) =>
        previous.map((item) =>
          item._id === targetUser._id
            ? {
                ...item,
                accountStatus: status,
              }
            : item,
        ),
      );

      toast.success(
        "Account status updated",
      );
    } catch (error: any) {
      console.error(
        "Status update failed:",
        error,
      );

      toast.error(
        error?.response?.data?.message ||
          "Failed to update account status",
      );
    } finally {
      setUpdatingUser(null);
    }
  };

  // =====================================================
  // HELPERS
  // =====================================================

  const getRoleLabel = (
    role?: string,
  ) => {
    if (!role) return "Customer";

    return role
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase(),
      );
  };

  const getInitial = (
    name?: string,
  ) => {
    return (
      name?.charAt(0).toUpperCase() ||
      "U"
    );
  };

  const formatDate = (
    date?: string,
  ) => {
    if (!date) return "-";

    return new Date(date).toLocaleDateString(
      "en-NG",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      },
    );
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Users
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Manage platform users,
            administrators and account
            access.
          </p>
        </div>

        <button
          type="button"
          onClick={loadUsers}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw
            size={17}
            className={
              loading
                ? "animate-spin"
                : ""
            }
          />

          Refresh
        </button>
      </div>

      {/* STATS */}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Total Users
          </p>

          <p className="mt-2 text-2xl font-bold">
            {users.length}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Administrators
          </p>

          <p className="mt-2 text-2xl font-bold text-orange-500">
            {
              users.filter(
                (item) =>
                  item.isAdmin ||
                  item.role ===
                    "admin" ||
                  item.role ===
                    "super_admin",
              ).length
            }
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Active
          </p>

          <p className="mt-2 text-2xl font-bold text-green-600">
            {
              users.filter(
                (item) =>
                  item.accountStatus ===
                    "active" ||
                  !item.accountStatus,
              ).length
            }
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Suspended
          </p>

          <p className="mt-2 text-2xl font-bold text-red-500">
            {
              users.filter(
                (item) =>
                  item.accountStatus ===
                  "suspended",
              ).length
            }
          </p>
        </div>
      </div>

      {/* FILTERS */}

      <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm md:flex-row">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
            placeholder="Search name, email or phone..."
            className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 outline-none focus:border-orange-500"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(event) =>
            setRoleFilter(
              event.target.value,
            )
          }
          className="rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-orange-500"
        >
          <option value="all">
            All Roles
          </option>

          {roleOptions.map((role) => (
            <option
              key={role}
              value={role}
            >
              {getRoleLabel(role)}
            </option>
          ))}
        </select>
      </div>

      {/* TABLE */}

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        {loading ? (
          <div className="flex min-h-60 items-center justify-center">
            <div className="text-center">
              <RefreshCw
                size={28}
                className="mx-auto animate-spin text-orange-500"
              />

              <p className="mt-3 text-sm text-gray-500">
                Loading users...
              </p>
            </div>
          </div>
        ) : filteredUsers.length ===
          0 ? (
          <div className="flex min-h-60 items-center justify-center text-center">
            <div>
              <Users
                size={40}
                className="mx-auto text-gray-300"
              />

              <p className="mt-3 font-medium text-gray-700">
                No users found
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Try changing your search
                or filter.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px]">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                    User
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                    Role
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                    KYC
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                    Status
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                    Joined
                  </th>

                  <th className="px-5 py-4 text-right text-xs font-semibold uppercase text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {filteredUsers.map(
                  (item) => {
                    const isCurrentUser =
                      currentUser?._id ===
                      item._id;

                    const updating =
                      updatingUser ===
                      item._id;

                    return (
                      <tr
                        key={item._id}
                        className="hover:bg-gray-50"
                      >
                        {/* USER */}

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-orange-100 font-bold text-orange-600">
                              {item.avatar ? (
                                <img
                                  src={
                                    item.avatar
                                  }
                                  alt={
                                    item.name
                                  }
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                getInitial(
                                  item.name,
                                )
                              )}
                            </div>

                            <div>
                              <p className="font-semibold text-gray-900">
                                {
                                  item.name
                                }

                                {isCurrentUser && (
                                  <span className="ml-2 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] text-orange-600">
                                    You
                                  </span>
                                )}
                              </p>

                              <p className="text-xs text-gray-500">
                                {item.email ||
                                  item.phone ||
                                  "No contact"}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* ROLE */}

                        <td className="px-5 py-4">
                          <select
                            value={
                              item.role ||
                              (item.isAdmin
                                ? "admin"
                                : "customer")
                            }
                            disabled={
                              updating ||
                              isCurrentUser
                            }
                            onChange={(
                              event,
                            ) =>
                              updateRole(
                                item,
                                event
                                  .target
                                  .value,
                              )
                            }
                            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-orange-500 disabled:bg-gray-100"
                          >
                            {roleOptions.map(
                              (
                                role,
                              ) => (
                                <option
                                  key={
                                    role
                                  }
                                  value={
                                    role
                                  }
                                >
                                  {getRoleLabel(
                                    role,
                                  )}
                                </option>
                              ),
                            )}
                          </select>
                        </td>

                        {/* KYC */}

                        <td className="px-5 py-4">
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium capitalize text-gray-600">
                            {(
                              item.kycStatus ||
                              "not_started"
                            ).replace(
                              /_/g,
                              " ",
                            )}
                          </span>
                        </td>

                        {/* STATUS */}

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                              item.accountStatus ===
                              "suspended"
                                ? "bg-yellow-100 text-yellow-700"
                                : item.accountStatus ===
                                  "blocked"
                                ? "bg-red-100 text-red-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {item.accountStatus ||
                              "active"}
                          </span>
                        </td>

                        {/* JOINED */}

                        <td className="px-5 py-4 text-sm text-gray-500">
                          {formatDate(
                            item.createdAt,
                          )}
                        </td>

                        {/* ACTIONS */}

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              disabled={
                                updating ||
                                isCurrentUser
                              }
                              title="Activate user"
                              onClick={() =>
                                updateStatus(
                                  item,
                                  "active",
                                )
                              }
                              className="rounded-lg p-2 text-green-600 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <UserCheck
                                size={17}
                              />
                            </button>

                            <button
                              type="button"
                              disabled={
                                updating ||
                                isCurrentUser
                              }
                              title="Suspend user"
                              onClick={() =>
                                updateStatus(
                                  item,
                                  "suspended",
                                )
                              }
                              className="rounded-lg p-2 text-yellow-600 hover:bg-yellow-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <UserX
                                size={17}
                              />
                            </button>

                            <button
                              type="button"
                              disabled={
                                updating ||
                                isCurrentUser
                              }
                              title="Block user"
                              onClick={() =>
                                updateStatus(
                                  item,
                                  "blocked",
                                )
                              }
                              className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <ShieldOff
                                size={17}
                              />
                            </button>

                            {item.isAdmin && (
                              <span
                                title="Administrator"
                                className="rounded-lg p-2 text-orange-500"
                              >
                                <ShieldCheck
                                  size={
                                    17
                                  }
                                />
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* RESULT COUNT */}

      {!loading && (
        <p className="text-sm text-gray-500">
          Showing{" "}
          <span className="font-semibold text-gray-700">
            {filteredUsers.length}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-gray-700">
            {users.length}
          </span>{" "}
          users
        </p>
      )}
    </div>
  );
}