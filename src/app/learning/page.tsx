"use client";
import React, { useEffect, useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { supabase } from '../../lib/supabaseClient';
import styles from './learning.module.css';

type Course = {
    id: string;
    title: string;
    description: string;
    category: string;
    image_url?: string;
};

export default function LearningPage() {
    const [courses, setCourses] = useState<Course[]>([]);

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        const { data, error } = await supabase.from('courses').select('*');

        if (error || !data || data.length === 0) {
            setCourses([
                { id: '1', title: "Advanced React Patterns", category: "Technical", description: "Master advanced concepts like HOCs, Render Props, and Hooks." },
                { id: '2', title: "Effective Communication", category: "Soft Skills", description: "Improve your workplace communication and leadership skills." },
                { id: '3', title: "Project Management 101", category: "Management", description: "Learn the basics of agile and scrum methodologies." }
            ]);
        } else {
            setCourses(data);
        }
    };

    return (
        <>
            <Navbar />
            <div className={styles.container}>
                <h1 className={styles.title}>Learning & Development</h1>
                <div className={styles.grid}>
                    {courses.map((course) => (
                        <div key={course.id} className={styles.courseCard}>
                            <div className={styles.imagePlaceholder}>
                                {course.image_url ? <img src={course.image_url} alt={course.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : 'Course Image'}
                            </div>
                            <div className={styles.content}>
                                <span className={styles.tag}>{course.category}</span>
                                <h3 className={styles.courseTitle}>{course.title}</h3>
                                <p className={styles.description}>{course.description}</p>
                                <button className={styles.startBtn}>Start Course</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
