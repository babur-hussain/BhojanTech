#!/bin/bash
openssl genrsa -out ca.key 2048
openssl req -x509 -new -nodes -key ca.key -sha256 -days 3650 -out ca.crt -subj "/C=IN/ST=Rajasthan/L=Jaipur/O=RestoOS/OU=RestoOS POS/CN=RestoOS Root CA"
openssl genrsa -out server.key 2048
openssl req -new -key server.key -out server.csr -subj "/C=IN/ST=Rajasthan/L=Jaipur/O=RestoOS/OU=RestoOS POS/CN=restaurantsos.lfvs.in"
cat <<EXT > ext.cnf
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName = @alt_names
[alt_names]
DNS.1 = restaurantsos.lfvs.in
DNS.2 = localhost
EXT
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out server.crt -days 3650 -sha256 -extfile ext.cnf
cat server.crt > cert-chain.txt
echo "--START INTERMEDIATE CERT--" >> cert-chain.txt
cat ca.crt >> cert-chain.txt
openssl pkcs8 -topk8 -inform PEM -outform PEM -in server.key -out server-pkcs8.key -nocrypt
