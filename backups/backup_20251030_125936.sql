--
-- PostgreSQL database dump
--

\restrict LwcnHc6OhQ6sFyvAjEimnUrd5W6UQL5K3ma4GVPJ01iWOeqkuMKkl13DZrzFMOp

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
avy0hbwJWypWlYdU4gMnWYZNAcgqdP40	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-06T15:52:43.644Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":1}}	2025-11-06 15:52:44
KNAHxlBYUGvwTj24npSua0trC68u3c9v	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-06T15:53:28.336Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":1}}	2025-11-06 15:53:29
KfhbTkNers61oLhGXAyNktdFDnbZTIVs	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-06T15:54:21.506Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":1}}	2025-11-06 15:54:22
Y0I1eO6QZ89LEViF6BUbI9qU5B8ZA6X4	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-06T15:54:21.590Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":1}}	2025-11-06 15:54:22
MLZBMUzKthKg6x1H6bbAw-8oYOGIZjni	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-06T15:55:29.523Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":1}}	2025-11-06 15:55:30
8uUGLye7wl6U8Xi5euEivRrTldPi1oRH	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-06T15:53:28.352Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":1}}	2025-11-06 15:53:29
nP9T7zb2NeSMNxVuG5XLoYkjooWm5imD	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-06T15:53:28.318Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":1}}	2025-11-06 15:53:29
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, password, role, created_at) FROM stdin;
1	admin	7b5b4e51d76b72e381bbba8e4f71a1499e05510ae5632302d95a4f4a239cf69ee678992a7b834d33bc86d444b362e6098049bcddefe391adba0701f8f662cd18.598c69ec34c123bd0fcc15baa19b6e10	admin	2025-10-30 15:55:28.873142
4	waiter	2d563588fb212f67fa0a7ca24075b32572c478d3822babc85f1e926c34298159dce667052d1dbd9cdb3680616712292b07b7c29de76e11534a79e9daa7a6d5c9.5cb9deebda2b2dffd8588b8597282039	waiter	2025-10-30 15:55:29.015834
7	cashier	91644555a257a9cee6267ae5936937ea32c9974e47cecc911b3bd373bfc30ec1e96a67b4cd57ff4cfe23fbc8eede77b60f29757be02726dc40cd51230c47db2e.79e3d8d26ddb70588a37c39231864b0d	cashier	2025-10-30 15:55:29.127355
10	kitchen	2987f2ec773207cd1ca480455ce79d6b8e59833b50168e8ec8818e8b1d97f460d64d7d622e7634d873c09be11985a52b7103cc0ed5a34da0a2250a0f49a2d993.d5829683bbfd48d512f8689071df01a0	kitchen	2025-10-30 15:55:29.231956
13	bar	06f09674544f6b5fff2e717fdd7a974f19192f54c1281904350f6be5247da85b7c680fa7cc6b22df2b2586feda59edeba65e35bc672495cb529a3b0da4df6fa1.440a5ad1b8b7b8737fc3414478360a17	bar	2025-10-30 15:55:29.329969
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

SELECT pg_catalog.setval('public.users_id_seq', 17, true);


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

\unrestrict LwcnHc6OhQ6sFyvAjEimnUrd5W6UQL5K3ma4GVPJ01iWOeqkuMKkl13DZrzFMOp

