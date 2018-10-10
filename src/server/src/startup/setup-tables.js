const userTable = `
    CREATE TABLE IF NOT EXISTS ghmb_users (
      id SERIAL,
      name VARCHAR(100) NOT NULL,
      license VARCHAR(255) NOT NULL,
      steam VARCHAR(255) DEFAULT NULL,
      cash INT(11) UNSIGNED DEFAULT 0,
      changed_at TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
      PRIMARY KEY(id),
      CONSTRAINT ident_unique UNIQUE (license, steam, name),
      INDEX ghmb_users_idx_id_name (id, name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

const accountTable = `
    CREATE TABLE IF NOT EXISTS ghmb_accounts (
      id SERIAL,
      owner BIGINT UNSIGNED NOT NULL,
      accountname VARCHAR(60) NOT NULL,
      accountnumber VARCHAR(16) NOT NULL,
      bank VARCHAR(20) NOT NULL,
      balance INT(11) DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT current_timestamp(),
      changed_at TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
      PRIMARY KEY(id),
      CONSTRAINT fk_accounts_owner FOREIGN KEY (owner) REFERENCES ghmb_users(id) ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT accountnumber_unique UNIQUE (accountnumber),
      INDEX ghmb_accounts_idx_owner_id (owner, id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

const transactionTable = `
    CREATE TABLE IF NOT EXISTS ghmb_transactions (
      id SERIAL,
      amount INT NOT NULL,
      account BIGINT UNSIGNED NOT NULL,
      purpose VARCHAR(255) DEFAULT NULL,
      issued_at TIMESTAMP NOT NULL DEFAULT current_timestamp(),
      origin VARCHAR(255) NOT NULL,
      origin_type VARCHAR(100) NOT NULL,
      PRIMARY KEY(id),
      CONSTRAINT fk_transactions_account FOREIGN KEY (account) REFERENCES ghmb_accounts(id) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

const accessTable = `
    CREATE TABLE IF NOT EXISTS ghmb_access (
      account BIGINT UNSIGNED NOT NULL,
      user BIGINT UNSIGNED NOT NULL,
      CONSTRAINT fk_access_account FOREIGN KEY (account) REFERENCES ghmb_accounts(id) ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT fk_access_user FOREIGN KEY (user) REFERENCES ghmb_users(id) ON DELETE CASCADE ON UPDATE CASCADE,
      INDEX ghmb_access_idx_account_user (account, user)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

module.exports = {
  userTable,
  accountTable,
  transactionTable,
  accessTable,
};
