--
-- PostgreSQL database dump
--

\restrict hNuBfGeMf1W3RTB24VCWjX3KXMMTqcmLtINDTGIc2LQtFjxe3MgFHfYa0m7OaMa

-- Dumped from database version 16.10 (Debian 16.10-1.pgdg13+1)
-- Dumped by pg_dump version 18.0 (Ubuntu 18.0-1.pgdg24.04+3)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: order_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_items (
    id integer NOT NULL,
    order_id integer NOT NULL,
    product_id integer NOT NULL,
    quantity integer NOT NULL,
    price_at_time numeric(10,2) NOT NULL,
    station text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT order_items_station_check CHECK ((station = ANY (ARRAY['kitchen'::text, 'bar'::text]))),
    CONSTRAINT order_items_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'preparing'::text, 'ready'::text, 'delivered'::text])))
);


ALTER TABLE public.order_items OWNER TO postgres;

--
-- Name: order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.order_items_id_seq OWNER TO postgres;

--
-- Name: order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.order_items_id_seq OWNED BY public.order_items.id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    id integer NOT NULL,
    table_number text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    total_amount numeric(10,2),
    payment_method text,
    waiter_id integer,
    cashier_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    closed_at timestamp without time zone,
    CONSTRAINT orders_payment_method_check CHECK ((payment_method = ANY (ARRAY['cash'::text, 'credit'::text, 'debit'::text, 'pix'::text]))),
    CONSTRAINT orders_status_check CHECK ((status = ANY (ARRAY['open'::text, 'paid'::text, 'cancelled'::text])))
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.orders_id_seq OWNER TO postgres;

--
-- Name: orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id integer NOT NULL,
    name text NOT NULL,
    brand text NOT NULL,
    price numeric(10,2) NOT NULL,
    quantity integer NOT NULL,
    min_stock_level integer NOT NULL,
    imageurl text,
    discount numeric(5,2) DEFAULT 0 NOT NULL,
    created_by integer,
    station text DEFAULT 'kitchen'::text NOT NULL,
    CONSTRAINT products_station_check CHECK ((station = ANY (ARRAY['kitchen'::text, 'bar'::text])))
);


ALTER TABLE public.products OWNER TO postgres;

--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.products_id_seq OWNER TO postgres;

--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: session; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.session (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.session OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    role text DEFAULT 'waiter'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'waiter'::text, 'cashier'::text, 'kitchen'::text, 'bar'::text])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: order_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items ALTER COLUMN id SET DEFAULT nextval('public.order_items_id_seq'::regclass);


--
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_items (id, order_id, product_id, quantity, price_at_time, station, status, created_at) FROM stdin;
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orders (id, table_number, status, total_amount, payment_method, waiter_id, cashier_id, created_at, closed_at) FROM stdin;
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (id, name, brand, price, quantity, min_stock_level, imageurl, discount, created_by, station) FROM stdin;
\.


--
-- Data for Name: session; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.session (sid, sess, expire) FROM stdin;
JaQUKz-kFeLQ9C4VBtPC5BnoHIx170zS	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-06T15:54:21.534Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":1}}	2025-11-06 15:54:22
noaV6Z1SCf4FM3uvcEPM9dVuVSFz-TVJ	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-06T15:55:29.575Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":1}}	2025-11-06 15:55:30
QQn4rqxyiNvp6LaJwzUsotDGvRQMw5dB	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-06T15:51:44.806Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":1}}	2025-11-06 15:51:46
f20W1rczKgMsFi1L41ExiH6loSnRasSf	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-06T15:55:29.594Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":1}}	2025-11-06 15:55:30
slBa9PwJTyK98mcHAyT_-H1AYUNUUskp	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-06T16:00:48.441Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":1}}	2025-11-06 16:00:49
avy0hbwJWypWlYdU4gMnWYZNAcgqdP40	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-06T15:52:43.644Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":1}}	2025-11-06 15:52:44
KNAHxlBYUGvwTj24npSua0trC68u3c9v	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-06T15:53:28.336Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":1}}	2025-11-06 15:53:29
KfhbTkNers61oLhGXAyNktdFDnbZTIVs	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-06T15:54:21.506Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":1}}	2025-11-06 15:54:22
Y0I1eO6QZ89LEViF6BUbI9qU5B8ZA6X4	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-06T15:54:21.590Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":1}}	2025-11-06 15:54:22
MLZBMUzKthKg6x1H6bbAw-8oYOGIZjni	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-06T15:55:29.523Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":1}}	2025-11-06 15:55:30
Zq6-mGdN4aIZzMHdYE47jPehbhdrxrr5	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-07T03:34:34.738Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":1}}	2025-11-07 03:34:35
8uUGLye7wl6U8Xi5euEivRrTldPi1oRH	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-06T15:53:28.352Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":1}}	2025-11-06 15:53:29
nP9T7zb2NeSMNxVuG5XLoYkjooWm5imD	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-06T15:53:28.318Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":1}}	2025-11-06 15:53:29
cNxsO8kg9gaaOmbdzlG7kPl2q6N-B5hx	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-06T16:01:42.515Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":1}}	2025-11-06 16:01:43
qblxhc8rQmVvSDuFMJ1sV12NiKuqwx7S	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-07T03:34:34.716Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":1}}	2025-11-07 03:34:35
lPk0DNO_w5DrPkqzWDxrDqCEVk-U28aX	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-07T03:34:34.775Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":1}}	2025-11-07 03:34:36
qJaYqrf7qD1Y18u3UJYSnP9O7GDOS3la	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-06T16:01:42.463Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":1}}	2025-11-06 16:01:43
ERWZR-iBNlAv7jlNer9ZmJyA87nspzT7	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-06T16:01:42.409Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":1}}	2025-11-06 16:01:43
Kn5MKfcBSnz9QF9wsY9jzTiotQAqvK5K	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-06T16:00:48.529Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":1}}	2025-11-06 16:00:49
xwNaVAOqYJyzjCjH14LS6pbo0cjcrbRi	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-06T16:00:48.463Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":1}}	2025-11-06 16:00:49
-txpXuYqWOMVDDjI8-pYZLU3lTtEebfM	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-06T19:30:02.572Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":1}}	2025-11-06 19:30:03
sUoY8TPxDw3lDXVEsz1ywC_dxH8X6Awp	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-06T19:31:16.486Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":1}}	2025-11-06 19:31:17
9e2yYA9SwYgF_1nz5zpo1R-IyL3BAN80	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-06T19:31:16.486Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":1}}	2025-11-06 19:31:17
WTj0p9O5YQu66HSOY94-6Rh0iJuAVvZp	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-06T19:31:16.552Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":1}}	2025-11-06 19:31:17
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, password, role, created_at) FROM stdin;
1	admin	0798b6ae55c13f33bda9f8636b22424ffba9d2e1c735ebd7478f77b7ff5abcbdd57e5ebb7b9d191aeadc8b1aa6fd685d11c25445e3ee7af802bd867025b9ae72.3b9c008df9d530fa910927534f0c5fea	admin	2025-10-31 03:34:34.128514
4	waiter	d538f8f470a20115de4c8e04e34f9c7d511454e7257495769fd33be2103e723f0204492e19dcbcfda5c53708474ffd774f0b56c185f87026c57e3cc841a554db.c8039d26ef9b6cfbce2a2941e3397d14	waiter	2025-10-31 03:34:34.237179
7	cashier	87f95384ff8cc1512cfd51ffd64e10cd559f36c0f4e6abfecef3645853f0154f4ea0db700b93f176668b6a33dd6179f41fe078cc4dde2048a31da44883c47695.c02ae1c213bd626040cdeee2d970b78c	cashier	2025-10-31 03:34:34.315143
9	kitchen	a67f2a62a23bb40876e00ba7557aa278cf60390b95e18e5f854065ecbd87fcf08e292a67a1d986aea14b57c03f69dffe1eb6ac4d2d782b8893f55148b4f53f41.7f3020c363320d9e4eddab269f2d522a	kitchen	2025-10-31 03:34:34.427359
12	bar	a8a4dd8f02f8c59ca5e8dae9a3e763d6d9dde73b0f51538e89e48e323623d6e5123abeddffc811b43615f6540e8388ae4029b2de776ab3b6e2638d7b2cf94f46.dd1cd44768f3cc44bb4ab66b7de92f97	bar	2025-10-31 03:34:34.561018
\.


--
-- Name: order_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.order_items_id_seq', 1, false);


--
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.orders_id_seq', 1, false);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.products_id_seq', 3, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 16, true);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_session_expire" ON public.session USING btree (expire);


--
-- Name: order_items_station_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX order_items_station_status_idx ON public.order_items USING btree (station, status);


--
-- Name: orders_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX orders_status_idx ON public.orders USING btree (status);


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: orders orders_cashier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_cashier_id_fkey FOREIGN KEY (cashier_id) REFERENCES public.users(id);


--
-- Name: orders orders_waiter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_waiter_id_fkey FOREIGN KEY (waiter_id) REFERENCES public.users(id);


--
-- Name: products products_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict hNuBfGeMf1W3RTB24VCWjX3KXMMTqcmLtINDTGIc2LQtFjxe3MgFHfYa0m7OaMa

