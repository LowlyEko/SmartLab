-- ============================================================
--  SECTION 1: USER MANAGEMENT
-- ============================================================

CREATE TABLE colleges (
    college_id      SERIAL          PRIMARY KEY,
    college_name    VARCHAR(150)    NOT NULL UNIQUE,
    college_code    VARCHAR(20)     NOT NULL UNIQUE
);

CREATE TABLE users (
    user_id         SERIAL          PRIMARY KEY,
    student_number  VARCHAR(30)     UNIQUE,
    first_name      VARCHAR(80)     NOT NULL,
    last_name       VARCHAR(80)     NOT NULL,
    middle_name     VARCHAR(80),
    email           VARCHAR(150)    NOT NULL UNIQUE,
    contact_number  VARCHAR(20),
    college_id      INT             REFERENCES colleges(college_id) ON DELETE SET NULL,
    user_type       VARCHAR(20)     NOT NULL
                        CHECK (user_type IN ('student', 'staff', 'admin', 'professor')),
    year_level      SMALLINT        CHECK (year_level BETWEEN 1 AND 6),
    section         VARCHAR(20),
    password_hash   TEXT            NOT NULL,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- ============================================================
--  SECTION 2: CENTRALIZED INVENTORY
-- ============================================================

-- Master inventory table — every item lives here first
CREATE TABLE inventory_items (
    item_id         SERIAL          PRIMARY KEY,
    category        VARCHAR(20)     NOT NULL
                        CHECK (category IN ('glassware', 'equipment', 'apparatus', 'supply', 'chemical')),
    name            VARCHAR(150)    NOT NULL,
    location        VARCHAR(150),
    amount          DECIMAL(12,4)   NOT NULL DEFAULT 0 CHECK (amount >= 0),
    unit            VARCHAR(30),                                 -- e.g. pcs, mL, g, L
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- ── Glassware detail ────────────────────────────────────────

CREATE TABLE inventory_glassware_details (
    item_id         INT             PRIMARY KEY
                        REFERENCES inventory_items(item_id) ON DELETE CASCADE,
    description     TEXT
);

-- One glassware item can have multiple brands, each with its own stock count
CREATE TABLE inventory_glassware_brands (
    brand_entry_id  SERIAL          PRIMARY KEY,
    item_id         INT             NOT NULL
                        REFERENCES inventory_items(item_id) ON DELETE CASCADE,
    brand_name      VARCHAR(100)    NOT NULL,
    amount          INT             NOT NULL DEFAULT 0 CHECK (amount >= 0),
    remarks         TEXT,
    created_at      TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP     NOT NULL DEFAULT NOW(),
    UNIQUE (item_id, brand_name)
);

-- ── Equipment detail ─────────────────────────────────────────

CREATE TABLE inventory_equipment_details (
    item_id                 INT             PRIMARY KEY
                                REFERENCES inventory_items(item_id) ON DELETE CASCADE,
    brand_model             VARCHAR(150),
    serial_number           VARCHAR(100)    UNIQUE,
    property_number         VARCHAR(100)    UNIQUE,
    equipment_code          VARCHAR(60)     UNIQUE,
    calibration_date        DATE,
    calibration_frequency   VARCHAR(60),
    remarks                 TEXT
);

-- ── Apparatus detail ─────────────────────────────────────────

CREATE TABLE inventory_apparatus_details (
    item_id         INT             PRIMARY KEY
                        REFERENCES inventory_items(item_id) ON DELETE CASCADE,
    description     TEXT,
    brand           VARCHAR(100),
    remarks         TEXT
);

-- ── Supply detail ────────────────────────────────────────────

CREATE TABLE inventory_supply_details (
    item_id         INT             PRIMARY KEY
                        REFERENCES inventory_items(item_id) ON DELETE CASCADE,
    brand           VARCHAR(100)
);

-- ── Chemical detail ──────────────────────────────────────────

CREATE TABLE inventory_chemical_details (
    item_id         INT             PRIMARY KEY
                        REFERENCES inventory_items(item_id) ON DELETE CASCADE,
    remarks         TEXT
);

-- ============================================================
--  SECTION 3: RESERVATIONS
-- ============================================================

CREATE TABLE reservations (
    reservation_id      SERIAL          PRIMARY KEY,
    group_number        VARCHAR(30),
    reserving_student   INT             NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    professor_id        INT             REFERENCES users(user_id) ON DELETE SET NULL,
    custodian_id        INT             REFERENCES users(user_id) ON DELETE SET NULL,
    date_requested      TIMESTAMP     NOT NULL DEFAULT NOW(),
    date_needed         DATE            NOT NULL,
    time_start          TIME            NOT NULL,
    time_end            TIME            NOT NULL,
    activity_title      VARCHAR(200),
    status              VARCHAR(20)     NOT NULL DEFAULT 'to_review'
                            CHECK (status IN ('to_review', 'allowed', 'rejected', 'conditional')),
    conditions_note     TEXT,
    rejection_reason    TEXT,
    created_at          TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP     NOT NULL DEFAULT NOW(),
    CHECK (time_end > time_start)
);

CREATE TABLE reservation_members (
    member_id       SERIAL  PRIMARY KEY,
    reservation_id  INT     NOT NULL REFERENCES reservations(reservation_id) ON DELETE CASCADE,
    student_id      INT     NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE (reservation_id, student_id)
);

-- All five item categories in one table — item_id is a proper FK to inventory_items
CREATE TABLE reservation_items (
    res_item_id     SERIAL          PRIMARY KEY,
    reservation_id  INT             NOT NULL REFERENCES reservations(reservation_id) ON DELETE CASCADE,
    item_id         INT             NOT NULL REFERENCES inventory_items(item_id) ON DELETE RESTRICT,
    quantity        INT             NOT NULL DEFAULT 1 CHECK (quantity > 0),
    volume_size     VARCHAR(60),                                 -- e.g. "250 mL", "500 g"
    notes           TEXT,
    UNIQUE (reservation_id, item_id)
);

-- ============================================================
--  SECTION 4: ACCOUNTABILITY (Broken Items)
-- ============================================================

CREATE TABLE accountability (
    accountability_id   SERIAL          PRIMARY KEY,
    reservation_id      INT             NOT NULL REFERENCES reservations(reservation_id) ON DELETE RESTRICT,
    responsible_student INT             NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    professor_id        INT             REFERENCES users(user_id) ON DELETE SET NULL,
    custodian_id        INT             REFERENCES users(user_id) ON DELETE SET NULL,
    item_id             INT             NOT NULL REFERENCES inventory_items(item_id) ON DELETE RESTRICT,
    item_description    TEXT            NOT NULL,                -- snapshot of name at incident time
    specifics           TEXT,
    quantity_broken     INT             NOT NULL DEFAULT 1 CHECK (quantity_broken > 0),
    date_time_broken    TIMESTAMP     NOT NULL DEFAULT NOW(),
    resolution_status   VARCHAR(20)     NOT NULL DEFAULT 'pending'
                            CHECK (resolution_status IN ('pending', 'replaced', 'paid', 'waived')),
    resolution_notes    TEXT,
    created_at          TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- ============================================================
--  SECTION 5: AUDIT / ACTIVITY LOG
-- ============================================================

CREATE TABLE activity_log (
    log_id          BIGSERIAL       PRIMARY KEY,
    actor_id        INT             REFERENCES users(user_id) ON DELETE SET NULL,
    action          VARCHAR(80)     NOT NULL,                    -- e.g. 'reservation.approved'
    target_table    VARCHAR(60),
    target_id       INT,
    details         JSONB,
    created_at      TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- ============================================================
--  SECTION 6: INDEXES
-- ============================================================

CREATE INDEX idx_users_college              ON users(college_id);
CREATE INDEX idx_users_type                 ON users(user_type);
CREATE INDEX idx_inventory_items_category   ON inventory_items(category);
CREATE INDEX idx_inventory_items_active     ON inventory_items(is_active);
CREATE INDEX idx_glassware_brands_item      ON inventory_glassware_brands(item_id);
CREATE INDEX idx_reservations_student       ON reservations(reserving_student);
CREATE INDEX idx_reservations_status        ON reservations(status);
CREATE INDEX idx_reservations_date          ON reservations(date_needed);
CREATE INDEX idx_res_items_reservation      ON reservation_items(reservation_id);
CREATE INDEX idx_res_items_item             ON reservation_items(item_id);
CREATE INDEX idx_res_members_reservation    ON reservation_members(reservation_id);
CREATE INDEX idx_accountability_res         ON accountability(reservation_id);
CREATE INDEX idx_accountability_student     ON accountability(responsible_student);
CREATE INDEX idx_accountability_item        ON accountability(item_id);
CREATE INDEX idx_activity_log_actor         ON activity_log(actor_id);
CREATE INDEX idx_activity_log_target        ON activity_log(target_table, target_id);
