module.exports = {
    apps: [
        {
            name: 'restaurant-backend',
            script: './dist/index.js',
            instances: 4, // 4 workers for cluster mode
            exec_mode: 'cluster',
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'production',
                PORT: 8080
            },
            log_date_format: 'YYYY-MM-DD HH:mm Z',
            error_file: '/var/log/pm2/restaurant-backend-error.log',
            out_file: '/var/log/pm2/restaurant-backend-out.log',
            merge_logs: true,
        }
    ]
};
