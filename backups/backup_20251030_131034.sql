--
-- PostgreSQL database dump
--

\restrict lJT3SXZz8GsEPxA4WemMUk5mfXdwSjyKLUcWEq25hbQ7bgoeknk9RMzlKmNB1do

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
8uUGLye7wl6U8Xi5euEivRrTldPi1oRH	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-06T15:53:28.352Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":1}}	2025-11-06 15:53:29
nP9T7zb2NeSMNxVuG5XLoYkjooWm5imD	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-06T15:53:28.318Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":1}}	2025-11-06 15:53:29
cNxsO8kg9gaaOmbdzlG7kPl2q6N-B5hx	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-06T16:01:42.515Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":1}}	2025-11-06 16:01:43
qJaYqrf7qD1Y18u3UJYSnP9O7GDOS3la	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-06T16:01:42.463Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":1}}	2025-11-06 16:01:43
ERWZR-iBNlAv7jlNer9ZmJyA87nspzT7	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-06T16:01:42.409Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":1}}	2025-11-06 16:01:43
Kn5MKfcBSnz9QF9wsY9jzTiotQAqvK5K	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-06T16:00:48.529Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":1}}	2025-11-06 16:00:49
xwNaVAOqYJyzjCjH14LS6pbo0cjcrbRi	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-06T16:00:48.463Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":1}}	2025-11-06 16:00:49
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, password, role, created_at) FROM stdin;
1	admin	04d9a805658d5c30d8fee89333f7631b9b24704be48c9ade7a9b9db4124ab07575589ac26d435d98bee733fd6169a04ff0617f9c9d7c2d64039616e93969a839.457065c58a3ff1dc6f20d6900109d310	admin	2025-10-30 16:01:41.879505
4	waiter	7ede5388c085fa27174e9507e39132da0ab7d1cb617ee503f4a79ab45f8ca3b448f2ca3091fc35fb8a37813e1daea6e10fc13d49e320e50ce813ed861e04192e.37f0f58c30ccd789eea2b391ea6c2a1e	waiter	2025-10-30 16:01:42.012159
7	cashier	5a9a32d69489939fe49210b90ccdca060788fb53b4e2624d5d86225e5f137778a50b3d82a14adeef29975bd7487747e5d2c8f56d923bd369688fff70d6a720ee.abc592a6a84cd6f04dede2028c4ffa50	cashier	2025-10-30 16:01:42.145595
10	kitchen	52d4ea61c2d1c6c3259eb2370f4917dedc021bfde04da9a20ea3bd3b990cf76bad778b115a92af0d3fa2fb7c4ea44f1b718f13faa95932b28ae3c8538a606e04.c0a89c35a13cbe3df49a5592abbbd86c	kitchen	2025-10-30 16:01:42.22992
13	bar	2857e15596a94af64621ca1b89b25f0ee40f3968d174098a630a383fa9647c4bedc1a97a7360574ec9be92aa91ebea224ba4aeca84ff1b55a41f8325092aee3f.73781b0c2b1179edb2a6534671bfad71	bar	2025-10-30 16:01:42.307253
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

\unrestrict lJT3SXZz8GsEPxA4WemMUk5mfXdwSjyKLUcWEq25hbQ7bgoeknk9RMzlKmNB1do

