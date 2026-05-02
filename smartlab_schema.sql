-- ============================================================
--  SmartLab Database Schema
--  Handles: User Management, Item Reservation, Accountability,
--           and Inventory (Glassware, Equipment, Apparatus,
--           Supplies, Chemicals)
-- ============================================================

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
    student_number  VARCHAR(30)     UNIQUE,                      -- NULL for non-students
    first_name      VARCHAR(80)     NOT NULL,
    last_name       VARCHAR(80)     NOT NULL,
    middle_name     VARCHAR(80),
    email           VARCHAR(150)    NOT NULL UNIQUE,
    contact_number  VARCHAR(20),
    college_id      INT             REFERENCES colleges(college_id) ON DELETE SET NULL,
    user_type       VARCHAR(20)     NOT NULL CHECK (user_type IN ('student', 'staff', 'admin', 'professor')),
    year_level      SMALLINT        CHECK (year_level BETWEEN 1 AND 6),  -- NULL for non-students
    section         VARCHAR(20),
    password_hash   TEXT            NOT NULL,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ============================================================
--  SECTION 2: INVENTORY — GLASSWARE
-- ============================================================

CREATE TABLE inventory_glassware (
    glassware_id    SERIAL          PRIMARY KEY,
    name            VARCHAR(150)    NOT NULL,
    description     TEXT,
    location        VARCHAR(150),
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- One glassware item can have multiple brands, each with its own stock
CREATE TABLE inventory_glassware_brands (
    brand_entry_id  SERIAL          PRIMARY KEY,
    glassware_id    INT             NOT NULL REFERENCES inventory_glassware(glassware_id) ON DELETE CASCADE,
    brand_name      VARCHAR(100)    NOT NULL,
    amount          INT             NOT NULL DEFAULT 0 CHECK (amount >= 0),
    remarks         TEXT,                                        -- condition notes per brand
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE (glassware_id, brand_name)
);

-- ============================================================
--  SECTION 3: INVENTORY — EQUIPMENT
--  (Staff-handled only; shown as checkboxes in reservation)
-- ============================================================

CREATE TABLE inventory_equipment (
    equipment_id            SERIAL          PRIMARY KEY,
    equipment_name          VARCHAR(150)    NOT NULL,
    brand_model             VARCHAR(150),
    serial_number           VARCHAR(100)    UNIQUE,
    property_number         VARCHAR(100)    UNIQUE,
    equipment_code          VARCHAR(60)     UNIQUE,
    location                VARCHAR(150),
    calibration_date        DATE,
    calibration_frequency   VARCHAR(60),                         -- e.g. "Every 6 months"
    remarks                 TEXT,
    amount                  INT             NOT NULL DEFAULT 1 CHECK (amount >= 0),
    is_active               BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ============================================================
--  SECTION 4: INVENTORY — APPARATUS
-- ============================================================

CREATE TABLE inventory_apparatus (
    apparatus_id    SERIAL          PRIMARY KEY,
    apparatus_name  VARCHAR(150)    NOT NULL,
    description     TEXT,
    brand           VARCHAR(100),
    location        VARCHAR(150),
    remarks         TEXT,
    amount          INT             NOT NULL DEFAULT 0 CHECK (amount >= 0),
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ============================================================
--  SECTION 5: INVENTORY — SUPPLIES
-- ============================================================

CREATE TABLE inventory_supplies (
    supply_id       SERIAL          PRIMARY KEY,
    supply_name     VARCHAR(150)    NOT NULL,
    brand           VARCHAR(100),
    location        VARCHAR(150),
    amount          INT             NOT NULL DEFAULT 0 CHECK (amount >= 0),
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ============================================================
--  SECTION 6: INVENTORY — CHEMICALS
-- ============================================================

CREATE TABLE inventory_chemicals (
    chemical_id     SERIAL          PRIMARY KEY,
    chemical_name   VARCHAR(150)    NOT NULL,
    amount          DECIMAL(12,4)   NOT NULL DEFAULT 0 CHECK (amount >= 0),
    unit            VARCHAR(30),                                 -- e.g. mL, g, L
    location        VARCHAR(150),
    remarks         TEXT,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ============================================================
--  SECTION 7: RESERVATIONS
-- ============================================================

CREATE TABLE reservations (
    reservation_id      SERIAL          PRIMARY KEY,
    group_number        VARCHAR(30),
    reserving_student   INT             NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    professor_id        INT             REFERENCES users(user_id) ON DELETE SET NULL,
    custodian_id        INT             REFERENCES users(user_id) ON DELETE SET NULL,    -- assigned staff
    date_requested      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    date_needed         DATE            NOT NULL,
    time_start          TIME            NOT NULL,
    time_end            TIME            NOT NULL,
    activity_title      VARCHAR(200),
    status              VARCHAR(20)     NOT NULL DEFAULT 'to_review'
                            CHECK (status IN ('to_review', 'allowed', 'rejected', 'conditional')),
    conditions_note     TEXT,                                    -- notes if status = conditional
    rejection_reason    TEXT,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CHECK (time_end > time_start)
);

-- Group members linked to a reservation
CREATE TABLE reservation_members (
    member_id       SERIAL  PRIMARY KEY,
    reservation_id  INT     NOT NULL REFERENCES reservations(reservation_id) ON DELETE CASCADE,
    student_id      INT     NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE (reservation_id, student_id)
);

-- Regular items reserved (glassware, apparatus, supplies, chemicals)
CREATE TABLE reservation_items (
    res_item_id     SERIAL          PRIMARY KEY,
    reservation_id  INT             NOT NULL REFERENCES reservations(reservation_id) ON DELETE CASCADE,
    item_type       VARCHAR(20)     NOT NULL CHECK (item_type IN ('glassware', 'apparatus', 'supply', 'chemical')),
    item_id         INT             NOT NULL,                    -- FK resolved by item_type
    quantity        INT             NOT NULL DEFAULT 1 CHECK (quantity > 0),
    volume_size     VARCHAR(60),                                 -- e.g. "250 mL", "500 g"
    notes           TEXT
);

-- Equipment reserved (staff-handled; checkbox-style)
CREATE TABLE reservation_equipment (
    res_equip_id    SERIAL  PRIMARY KEY,
    reservation_id  INT     NOT NULL REFERENCES reservations(reservation_id) ON DELETE CASCADE,
    equipment_id    INT     NOT NULL REFERENCES inventory_equipment(equipment_id) ON DELETE RESTRICT,
    quantity        INT     NOT NULL DEFAULT 1 CHECK (quantity > 0),
    notes           TEXT,
    UNIQUE (reservation_id, equipment_id)
);

-- ============================================================
--  SECTION 8: ACCOUNTABILITY (Broken Items)
-- ============================================================

CREATE TABLE accountability (
    accountability_id   SERIAL          PRIMARY KEY,
    reservation_id      INT             NOT NULL REFERENCES reservations(reservation_id) ON DELETE RESTRICT,
    responsible_student INT             NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    professor_id        INT             REFERENCES users(user_id) ON DELETE SET NULL,
    custodian_id        INT             REFERENCES users(user_id) ON DELETE SET NULL,    -- custodian reported to
    item_type           VARCHAR(20)     NOT NULL CHECK (item_type IN ('glassware', 'apparatus', 'supply', 'chemical', 'equipment')),
    item_id             INT             NOT NULL,                -- FK resolved by item_type
    item_description    TEXT            NOT NULL,                -- name/label at time of incident
    specifics           TEXT,                                    -- how it was broken / damage details
    quantity_broken     INT             NOT NULL DEFAULT 1 CHECK (quantity_broken > 0),
    date_time_broken    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    resolution_status   VARCHAR(20)     NOT NULL DEFAULT 'pending'
                            CHECK (resolution_status IN ('pending', 'replaced', 'paid', 'waived')),
    resolution_notes    TEXT,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ============================================================
--  SECTION 9: AUDIT / ACTIVITY LOG (Optional but recommended)
-- ============================================================

CREATE TABLE activity_log (
    log_id          BIGSERIAL       PRIMARY KEY,
    actor_id        INT             REFERENCES users(user_id) ON DELETE SET NULL,
    action          VARCHAR(80)     NOT NULL,                    -- e.g. 'reservation.approved'
    target_table    VARCHAR(60),
    target_id       INT,
    details         JSONB,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ============================================================
--  SECTION 10: INDEXES
-- ============================================================

CREATE INDEX idx_users_college         ON users(college_id);
CREATE INDEX idx_users_type            ON users(user_type);
CREATE INDEX idx_reservations_student  ON reservations(reserving_student);
CREATE INDEX idx_reservations_status   ON reservations(status);
CREATE INDEX idx_reservations_date     ON reservations(date_needed);
CREATE INDEX idx_res_items_res         ON reservation_items(reservation_id);
CREATE INDEX idx_res_equip_res         ON reservation_equipment(reservation_id);
CREATE INDEX idx_accountability_res    ON accountability(reservation_id);
CREATE INDEX idx_accountability_student ON accountability(responsible_student);
CREATE INDEX idx_glassware_brands      ON inventory_glassware_brands(glassware_id);
CREATE INDEX idx_activity_log_actor    ON activity_log(actor_id);
CREATE INDEX idx_activity_log_target   ON activity_log(target_table, target_id);

-- ============================================================
--  SECTION 11: SAMPLE SEED DATA
-- ============================================================

INSERT INTO colleges (college_name, college_code) VALUES
    ('College of Engineering and Technology', 'CET'),
    ('College of Science and Mathematics', 'CSM'),
    ('College of Agriculture', 'CA'),
    ('College of Arts and Social Sciences', 'CASS'),
    ('College of Business Administration', 'CBA');

INSERT INTO users (first_name, last_name, email, user_type, password_hash) VALUES
    ('Lab',    'Admin',   'admin@smartlab.edu',     'admin',     'changeme_hash'),
    ('Maria',  'Santos',  'm.santos@smartlab.edu',  'staff',     'changeme_hash'),
    ('Dr. Jose','Reyes',  'j.reyes@smartlab.edu',   'professor', 'changeme_hash');

